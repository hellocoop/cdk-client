// index.ts
// standalone lambda function to check the cookie token and return a policy

import * as crypto from 'crypto';

import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, Context } from 'aws-lambda';
import jwt from 'jsonwebtoken'
import { JwtPayload } from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'

const { COGNITO_CLIENT_ID, HELLO_COOKIE_SECRET, COGNITO_CLAIMS, HELLO_CLAIMS, HELLO_DEBUG } = process.env;

// Function to convert a URL-safe base64 string to a Uint8Array
function urlSafeBase64ToUint8Array(base64String: string): Uint8Array {
    const base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binaryString = Buffer.from(base64 + padding, 'base64').toString('binary');
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }
    return uint8Array;
}

const verifyHelloToken = (encryptedStr: string) => {
    const secret = HELLO_COOKIE_SECRET;
    if (!secret) throw new Error('missing HELLO_COOKIE_SECRET')
    try {
        const encryptedData = urlSafeBase64ToUint8Array(encryptedStr);
        const iv = encryptedData.slice(0, 12);
        const tag = encryptedData.slice(-16);
        const ciphertext = encryptedData.slice(12, -16);
        const key = Buffer.from(secret, 'hex');    
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decryptedData = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const decryptedText = new TextDecoder().decode(decryptedData);
        return JSON.parse(decryptedText);
      } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Decryption error');
      }
}

const generateAcceptResponse = (sub: string, context: any) => {

  const response: APIGatewayAuthorizerResult = {
    principalId: sub,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "execute-api:Invoke",
          Resource: "*"
        }
      ]
    },
    context,
  }
  return response 
}

const DENY_RESPONSE: APIGatewayAuthorizerResult = {
    principalId: "unknown",
    policyDocument: {
        Version: "2012-10-17",
        Statement: [
        {
            Effect: "Deny",
            Action: "execute-api:Invoke",
            Resource: "*"
        }
        ]
    }
}

const pemCache: {[key: string]: string} = {}

const getKey = async (kid: string, alg: string, iss: string): Promise<string> => {
  if (pemCache[kid]) {
    return pemCache[kid]
  }
  try {
    const url = `${iss}/.well-known/jwks.json`
    const response = await fetch(url)
    const jwks = await response.json()
    for (const key of jwks.keys) {
        const pem = jwkToPem(key)
        pemCache[kid] = pem
    }
    if (pemCache[kid]) {
      return pemCache[kid]
    }
    const error = new Error(`key not found for kid ${kid} at ${url}`)
    throw error 
  } catch (error) {
    console.error('error in getKey', error)
    throw error
  }

}

const cognitoTokenHandler = async ( token: string ): Promise<APIGatewayAuthorizerResult> => {

    if (HELLO_DEBUG) {
      console.log('cognitoTokenHandler:token', token)
      console.log('cognitoTokenHandler:', JSON.stringify({COGNITO_CLIENT_ID,COGNITO_CLAIMS}, null, 2))
    }
    try {
        const j = jwt.decode(token, {complete: true})
        if (!j) {
            console.error('invalid token')
            return DENY_RESPONSE
        }
        const {header, payload} = j
        const { kid, alg } = header
        const { iss, aud, token_use, exp, iat, sub } = payload as JwtPayload
        if (!kid) {
            console.error('missing kid')
            return DENY_RESPONSE
        }
        if (!alg) {
            console.error('missing alg')
            return DENY_RESPONSE
        }
        if (!sub) {
            console.error('missing sub')
            return DENY_RESPONSE
        }

        if (!iss || !iss.startsWith('https://cognito-idp.')) {
            console.error('unknown issuer', iss)
            return DENY_RESPONSE
        }
        if (!COGNITO_CLIENT_ID) {
            console.error(`missing COGNITO_CLIENT_ID - Validating for client_id '${aud}'`)
        } else if (aud !== COGNITO_CLIENT_ID) {
            console.error(`invalid client_id '${aud}', expected '${COGNITO_CLIENT_ID}'`)
            return DENY_RESPONSE
        }
        if (token_use !== 'id') {
            console.error(`invalid token_use '${token_use}' - expected 'id'`)
            return DENY_RESPONSE
        }
        const now = Math.floor(Date.now() / 1000)
        if (!exp || now > exp) {
            console.error(`token expiry ${exp}, must be later than ${now}`)
            return DENY_RESPONSE
        }
        if (!iat || now < iat) {
            console.error(`token issued at ${iat}, must be earlier than ${now}`)
            return DENY_RESPONSE
        }
        const key = await getKey( kid, alg, iss )
        if (HELLO_DEBUG) console.log('cognitoTokenHandler:', JSON.stringify({key,iss}, null, 2))

        const decoded = jwt.verify(token, key) as {[key: string]: string}
        // all good if we made it here 

        const claims: [string] = (COGNITO_CLAIMS || 'email_verified email').split(' ') as [string]
        const context:{[key: string]: string} = { sub }
        for (const claim of claims) {
          context[claim] = decoded[claim]
        }
        const response = generateAcceptResponse( sub, context )
        if (HELLO_DEBUG) console.log('cognitoTokenHandler:response', JSON.stringify(response, null, 2))
  
        return response
    } catch (error) {
        console.error('error', error)
        return DENY_RESPONSE
    }

}

const helloTokenHandler = async ( token: string ): Promise<APIGatewayAuthorizerResult> => {
  if (HELLO_DEBUG) console.log('helloTokenHandler:token', token)
  try {
    const payload = verifyHelloToken(token)
    const { sub } = payload
    if (!sub) {
      console.error('missing sub')
      return DENY_RESPONSE
    }
    const claims = (HELLO_CLAIMS || 'email email_verified name picture').split(' ')
    const context: {[key: string]: string} = { sub }
    for (const claim of claims) {
      context[claim] = payload[claim]
    }
    const response = generateAcceptResponse( sub, context)
    if (HELLO_DEBUG) console.log('helloTokenHandler:response', JSON.stringify(response, null, 2))
    return response
  } catch (error) {
      console.error('error', error)
      return DENY_RESPONSE
  }
}
  
const handler = async (event: APIGatewayTokenAuthorizerEvent, context: Context): Promise<APIGatewayAuthorizerResult> => {
    let token = event?.authorizationToken;
    if (!token) {
        console.error('missing token')
        return DENY_RESPONSE
    }
    const parts = token.split('.')
    if (parts.length === 1) {
      return await helloTokenHandler(token)
    } else if (parts.length === 3) {
      return await cognitoTokenHandler(token)
    } else {
      console.error('unknown token format', token)
      return DENY_RESPONSE
    }
  }
  
  export { handler };
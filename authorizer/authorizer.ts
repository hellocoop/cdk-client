// index.ts
// standalone lambda function to check the cookie token and return a policy

import * as crypto from 'crypto';

import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';

const { CLIENT_ID, HELLO_COOKIE_SECRET } = process.env;

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

const verifyToken = (encryptedStr: string) => {
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

const createPolicy = (payload: any) => {
  const { sub, email, name, picture } = payload

  const policy = {
    principalId: sub,
    "policyDocument": {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": "execute-api:Invoke",
          "Resource": "*"
        }
      ]
    },
    "context": {
        sub,
        email,
        name,
        picture
    }
  }
  return policy 
}

const denyPolicy = {
    "principalId": "unknown",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
        {
            "Effect": "Deny",
            "Action": "execute-api:Invoke",
            "Resource": "*"
        }
        ]
    }
}
  
const handler = async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
    const { headers, body } = event
    const content = JSON.stringify({
      HELLO_COOKIE_SECRET,
      CLIENT_ID,
      headers,
      body,
    }, null, 2);
    console.log('event', content);
  
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 200
    }

    try {
        const { type, authorizationToken } = JSON.parse(body as string)
        if (type != 'TOKEN')
            throw new Error(`invalid type '${type}': MUST be TOKEN`)
        const payload = verifyToken(authorizationToken)
        const policy = createPolicy(payload)
        result.body = JSON.stringify(policy)
    } catch (error) {
        console.error('error', error)
        result.body = JSON.stringify(denyPolicy)
    }
    return result
  }
  
  export { handler };
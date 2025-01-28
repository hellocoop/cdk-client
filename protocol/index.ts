import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { Claims } from '@hellocoop/definitions'

import { 
  router,
  HelloResponse, 
  HelloRequest,
  LoginSyncResponse, 
  clearAuthCookieParams,
  isConfigured,
  configure,
  Config,
  PackageMetadata,
} from '@hellocoop/api'

import { serialize } from 'cookie'

// set name and version to provide in metadata
import parentPackageJson from './package.json'
const { name, version } = parentPackageJson;
PackageMetadata.setMetadata(name, version);

const LOGIN_SYNC_FUNCTION_ARN = process.env.LOGIN_SYNC_FUNCTION_ARN

const client = new LambdaClient();

type LoginSyncParams = {
  token: string,
  payload: Claims,
  target_uri: string,
}

const logDebug = process.env.HELLO_DEBUG 
if (logDebug) {
    console.log('HELLO_DEBUG:', logDebug);
    console.log('HELLO_CDK_CLIENT_VERSION:', process.env.HELLO_CDK_CLIENT_VERSION);
}

const loginSync = async (props: LoginSyncParams):Promise<LoginSyncResponse> => {

  if (logDebug) console.log('loginSync passed:', JSON.stringify(props, null, 2));
  
  if (!LOGIN_SYNC_FUNCTION_ARN) {  
    console.error('No login trigger function defined')
    return {}
  }

  const command = new InvokeCommand({
    FunctionName: LOGIN_SYNC_FUNCTION_ARN,
    Payload: JSON.stringify(props),
    InvocationType: 'RequestResponse',
  });
  
  try {
    const result = await client.send(command);
    const status = result.$metadata.httpStatusCode
    if (status !== 200) {
      console.error(`Error invoking function ${LOGIN_SYNC_FUNCTION_ARN}:`, result);
      return {}
    }
    const responseString = Buffer.from(result.Payload as Uint8Array).toString('utf8');
    try {
      const response = JSON.parse(responseString) as LoginSyncResponse
      if (logDebug) console.log(`loginSync response from ${LOGIN_SYNC_FUNCTION_ARN}:`, JSON.stringify(response, null, 2));
      return response
    } catch (error) {
      console.error(`Error parsing response "${responseString}" from function ${LOGIN_SYNC_FUNCTION_ARN}:`, error);
    }
  } catch (error) {
    console.error(`Error invoking function ${LOGIN_SYNC_FUNCTION_ARN}:`, error);
  }
  return {}
}

const config: Config = {
  logConfig: !!logDebug
}

if (LOGIN_SYNC_FUNCTION_ARN)
  config.loginSync = loginSync

if (!isConfigured)
  configure(config)

if (config.logConfig)
  console.log({ name, version });


const convertToHelloRequest = (event: APIGatewayProxyEventV2 ): HelloRequest => {
  const { headers, cookies, queryStringParameters, requestContext } = event
  let auth: any = undefined


console.log('event:', JSON.stringify(event, null, 2));

  let parsedBody: any = undefined;
  if (
    headers['content-type'] === 'application/x-www-form-urlencoded' ||
    headers['Content-Type'] === 'application/x-www-form-urlencoded'
  ) {
    const body = event.body || '';
    const params = new URLSearchParams(body);
    parsedBody = Object.fromEntries(params.entries());

    console.log('parsedBody:', parsedBody);

  }

  return {
    headers: () => headers as any,
    query: queryStringParameters as any,
    path: requestContext?.http?.path as any,
    getAuth: () => auth,
    setAuth: (a) => { auth = a; },
    method: requestContext?.http?.method as any,
    body: () => parsedBody || event.body as any,
    frameWork: 'aws-lambda',
    loginSyncWrapper: (loginSync, params) => {
      return loginSync(params)
    },
    logoutSyncWrapper: (logoutSync) => {
      return logoutSync({event})
    }
  };
};

const convertToHelloResponse = ( response: APIGatewayProxyStructuredResultV2 ): HelloResponse => {
  const send = (data: any) => {
    if (!response?.headers) response.headers = {}
    response.headers['Content-Type'] = 'text/html'
    response.body = data
    return response
  }
  return {
      clearAuth: () => {
          const { name, value, options } = clearAuthCookieParams()
          if (!response?.cookies) response.cookies = []
          response.cookies.push(serialize(name, value, options))
      },
      send,
      json: (data: any) => {
          if (!response?.headers) response.headers = {}
          response.headers['Content-Type'] = 'application/json'
          response.body = JSON.stringify(data)
      },
      redirect: (url : string) => {
        if (!response?.headers) response.headers = {}
        response.headers['Location'] = url
        response.statusCode = 302
      },
      setCookie: (name: string, value: string, options: any) => {
        if (!response?.cookies) response.cookies = []
        response.cookies.push(serialize(name, value, options))
      },
      getHeaders: () => response?.headers || {} as any,
      setHeader: (name: string, value: string | string[]) => {
        if (Array.isArray(value)) {
            if (name.toLowerCase() === 'set-cookie') {
                value.forEach(val => { 
                  if (!response?.headers) response.headers = {}
                  response.headers[name] = val
                 }) // Append each cookie individually
            } else {
              if (!response?.headers) response.headers = {}
              response.headers[name] = value.join(', '); // Combine array values into a single string separated by commas
            }
        } else {
          if (!response?.headers) response.headers = {}
          response.headers[name] = value;
        }
    },  


      status: ( statusCode: number) => { 
        response.statusCode = statusCode
        return { send }
      },
  }
}


const handler = async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyStructuredResultV2> => {
  // const { headers, cookies, queryStringParameters, body, isBase64Encoded, requestContext } = event;
  // const method = requestContext?.http?.method;
  // const path = requestContext?.http?.path;
  // console.log('event', JSON.stringify(event, null, 2));


  const result: APIGatewayProxyStructuredResultV2 = {
    statusCode: 200
  }
  const helloReq = convertToHelloRequest(event);
  const helloRes = convertToHelloResponse(result);
  try {
    await router(helloReq, helloRes)
  }
  catch (error) {
    console.error('Error in router:', error);
  }
  
  return result
}

export { handler };

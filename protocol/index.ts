import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { Claims } from '@hellocoop/types'

import { 
  router,
  HelloResponse, 
  HelloRequest,
  LoginSyncResponse, 
  clearAuthCookieParams,
  isConfigured,
  configure,
  Config,
} from '@hellocoop/router'

import { serialize } from 'cookie'

// Load environment variables
const { CLIENT_ID, HELLO_COOKIE_SECRET } = process.env;

const LOGIN_SYNC_FUNCTION_ARN = process.env.LOGIN_SYNC_FUNCTION_ARN

const client = new LambdaClient();

type LoginSyncParams = {
  token: string,
  payload: Claims,
  target_uri: string,
}


const loginSync = async (props: LoginSyncParams):Promise<LoginSyncResponse> => {

  console.log('loginSync passed:', JSON.stringify(props, null, 2));
  
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
    console.log('loginSync response:', JSON.stringify(result, null, 2));
    // return result.Payload && JSON.parse(result.Payload.toString());
    return {}
  } catch (error) {
    console.error('Error invoking function:', error);
    throw error;
  }
}

const config: Config = 
  LOGIN_SYNC_FUNCTION_ARN 
    ?  { loginSync }
    : {}


if (!isConfigured)
  configure(config)

console.log('config', JSON.stringify(config, null, 2));
console.log('LOGIN_SYNC_FUNCTION_ARN', LOGIN_SYNC_FUNCTION_ARN)

const convertToHelloRequest = (event: APIGatewayProxyEventV2 ): HelloRequest => {
  const { headers, cookies, queryStringParameters, requestContext } = event
  let auth: any = undefined
  return {
    headers: () => headers as any,
    query: queryStringParameters as any,
    path: requestContext?.http?.path as any,
    getAuth: () => auth,
    setAuth: (a) => { auth = a; },
    method: requestContext?.http?.method as any,
    body: () => event.body as any,
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
  const { headers, cookies, queryStringParameters, body, isBase64Encoded, requestContext } = event;
  const method = requestContext?.http?.method;
  const path = requestContext?.http?.path;

  // console.log('event', JSON.stringify(event, null, 2));
  console.log('env', JSON.stringify(process.env, null, 2));
  console.log('config', JSON.stringify(config, null, 2));

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

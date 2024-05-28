import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"


import {
  router,
  HelloResponse,
  HelloRequest,
  clearAuthCookieParams,
  getAuthfromCookies,
  isConfigured,
  configure,
  Config,
  configuration,
  LoginSyncParams, 
  LoginSyncResponse
} from '@hellocoop/router';

import { serialize } from 'cookie'

// Load environment variables
const { CLIENT_ID, HELLO_COOKIE_SECRET } = process.env;



const LOGIN_TRIGGER_FUNCTION_ARN = process.env.LOGIN_TRIGGER_FUNCTION_ARN

const client = new LambdaClient();

const loginSync = async (props: LoginSyncParams):Promise<LoginSyncResponse> => {

  console.log('loginSync', JSON.stringify(props, null, 2));
  
  if (!LOGIN_TRIGGER_FUNCTION_ARN) {  
    console.error('No login trigger function defined')
    return {}
  }

  const command = new InvokeCommand({
    FunctionName: LOGIN_TRIGGER_FUNCTION_ARN,
    Payload: JSON.stringify(props.payload),
    InvocationType: 'RequestResponse',

  });
  
  try {
    const result = await client.send(command);
    return undefined as any
    // return result.Payload && JSON.parse(result.Payload.toString());
  } catch (error) {
    console.error('Error invoking function:', error);
    throw error;
  }
}

const config: Config = 
  LOGIN_TRIGGER_FUNCTION_ARN 
    ?  { loginSync }
    : {}

console.log('config', JSON.stringify(config, null, 2));

if (!isConfigured)
  configure(config)

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
      setHeader: (name: string, value: string) => {
        if (!response?.headers) response.headers = {}
        response.headers[name] = value
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

  console.log('event', JSON.stringify(event, null, 2));
  console.log('env', JSON.stringify(process.env, null, 2));

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

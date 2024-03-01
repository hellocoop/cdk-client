import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';

import {
  router,
  HelloResponse,
  HelloRequest,
  clearAuthCookieParams,
  getAuthfromCookies,
  isConfigured,
  configure,
  Config,
} from '@hellocoop/router';

import { serialize } from 'cookie'

// Load environment variables
const { CLIENT_ID, HELLO_COOKIE_SECRET } = process.env;
// Load configuration
const config: Config = require('./hello.config.js')
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
  const content = JSON.stringify({
    HELLO_COOKIE_SECRET,
    CLIENT_ID,
    method,
    path,
    headers,
    cookies,
    queryStringParameters,
    body,
    isBase64Encoded,
  }, null, 2);
  console.log('event', content);

  const result: APIGatewayProxyStructuredResultV2 = {
    statusCode: 200
  }
  const helloReq = convertToHelloRequest(event);
  const helloRes = convertToHelloResponse(result);
  await router(helloReq, helloRes)
  return result
}

export { handler };

# @hellocoop/cdk-client

A Hellō Client CDK Construct for a Lambda Function

## Quickstart

```sh
npm install @hellocoop/cdk-client
```

```TypeScript
import { HelloClientConstruct } from '@hellocoop/cdk-client'

// Create the Hello Client Lambda and functionUrl
const helloClient = new HelloClientConstruct(this, 'HelloClient', {
    clientID: CLIENT_ID,    // required = your Hellō client_id from https://console.hello.coop
    hostname: HOSTNAME,     // recommended - public hostname 
    route: HELLO_API_ROUTE, // optional - defaults to /api/hellocoop
});

// add Hello Client Lambda origin as a behavior to a Cloud Front Distribution
distribution.addBehavior(HELLO_API_ROUTE, new origins.FunctionUrlOrigin(helloClient.functionUrl), {
    viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
    allowedMethods: cf.AllowedMethods.ALLOW_ALL,
    cachePolicy: cf.CachePolicy.CACHING_DISABLED,
    originRequestPolicy: new cf.OriginRequestPolicy(this, 'hellocoop', {
        queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cf.OriginRequestCookieBehavior.all(),
    }),
});

```
See TBD for details on `HelloClientConstruct`

## Client Usage

See TBD for details

### Login
`/api/hellocoop?op=login`

### Logout
`/api/hellocoop?op=logout`

### Get Auth
`/api/hellocoop?op=auth`
// simple authorizer function

exports.handler = async (event) => {
    const token = event.headers.Authorization || event.authorizationToken;
    // Validate the token here
    if (token === 'allow') {
      return generatePolicy('user', 'Allow', event.methodArn);
    } else {
      return generatePolicy('user', 'Deny', event.methodArn);
    }
  };
  
  const generatePolicy = (principalId, effect, resource) => {
    const authResponse = { principalId };
    if (effect && resource) {
      const policyDocument = {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        }],
      };
      authResponse.policyDocument = policyDocument;
    }
    return authResponse;
  };
  
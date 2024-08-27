import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

const config = new pulumi.Config()
const bastionAccountId = config.requireSecret('bastionAccountId')

// Create IAM user PulumiDeployer with access-to-production tag
export const pulumiDeployer = new aws.iam.User('PulumiDeployer', {
  name: 'PulumiDeployer',
  tags: {
    'access-to-production': 'true',
  },
})

// IAM Role used by Pulumi iam user to update our infrastructure from CI
export const deployerRole = pulumiDeployer.arn.apply((pulumiDeployerArn) =>
  bastionAccountId.apply(
    (bastionAccountId) =>
      new aws.iam.Role('DeployerRole', {
        name: 'DeployerRole',
        description:
          "Broad access for updating Pulumi stacks in the 'production' AWS account.",
        maxSessionDuration: 3600, // 1 hour
        assumeRolePolicy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                AWS: [
                  `arn:aws:iam::${bastionAccountId}:root`,
                  pulumiDeployerArn,
                ],
              },
              Condition: {
                'ForAllValues:StringEquals': {
                  'aws:PrincipalTag/access-to-production': 'true',
                },
              },
              Action: 'sts:AssumeRole',
            },
          ],
        }),
      }),
  ),
)

// Policy document defining the permissions granted to the DeployerRole.
export const deployerPolicyDocument: aws.iam.PolicyDocument = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        'ec2:*',
        'rds:*',
        'ecs:*',
        'elasticache:*',
        'route53:*',
        'acm:*',
        'logs:*',
        'iam:*',
        's3:*',
        'lambda:*',
        'ecr:*',
        'elasticloadbalancing:*',
        'secretsmanager:*',
        'cloudformation:*',
        'ssm:*',
      ],
      Resource: '*',
    },
  ],
}

const deployerPolicy = new aws.iam.Policy('DeployerPolicy', {
  name: 'DeployerRolePolicy',
  description:
    'Policy granting the permissions needed for deploying Latitude LLM applications',
  policy: deployerPolicyDocument,
})

new aws.iam.RolePolicyAttachment('DeployerRolePolicyAttachment', {
  role: deployerRole,
  policyArn: deployerPolicy.arn,
})

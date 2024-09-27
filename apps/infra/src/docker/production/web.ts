import * as aws from '@pulumi/aws'
import * as docker from '@pulumi/docker'
import * as pulumi from '@pulumi/pulumi'

import {
  postHogApiKey,
  sentryDsn,
  sentryOrg,
  sentryProject,
} from '../../app/production/shared'
import { resolve } from '../../shared'

const webProductionStack = new pulumi.StackReference('app-production-web')

const repo = webProductionStack.requireOutput(
  'repo',
) as pulumi.Output<aws.ecr.Repository>
const coreRepo = webProductionStack.requireOutput(
  'coreRepo',
) as pulumi.Output<aws.ecr.Repository>

const token = await aws.ecr.getAuthorizationToken()

pulumi.all([sentryDsn, sentryOrg, sentryProject, postHogApiKey]).apply(
  ([sentryDsn, sentryOrg, sentryProject, postHogApiKey]) =>
    new docker.Image('LatitudeLLMAppImage', {
      build: {
        platform: 'linux/amd64',
        context: resolve('../../../'),
        dockerfile: resolve('../../../apps/web/docker/Dockerfile'),
        cacheFrom: {
          images: [pulumi.interpolate`${repo.repositoryUrl}:latest`],
        },
        args: {
          SENTRY_DSN: sentryDsn,
          SENTRY_ORG: sentryOrg,
          SENTRY_PROJECT: sentryProject,
          NEXT_PUBLIC_POSTHOG_KEY: postHogApiKey,
          NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
        },
      },
      imageName: pulumi.interpolate`${repo.repositoryUrl}:latest`,
      registry: {
        server: repo.repositoryUrl,
        username: token.userName,
        password: pulumi.secret(token.password),
      },
    }),
)
new docker.Image('LatitudeLLMCoreImage', {
  build: {
    platform: 'linux/amd64',
    context: resolve('../../../'),
    dockerfile: resolve('../../../packages/core/docker/Dockerfile'),
    cacheFrom: {
      images: [pulumi.interpolate`${coreRepo.repositoryUrl}:latest`],
    },
  },
  imageName: pulumi.interpolate`${coreRepo.repositoryUrl}:latest`,
  registry: {
    server: coreRepo.repositoryUrl,
    username: token.userName,
    password: pulumi.secret(token.password),
  },
})

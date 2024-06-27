import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  DataIntegrityCredentialFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialProtocol,
  V1ProofProtocol,
} from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  AutoAcceptCredential,
  AutoAcceptProof,
  ConnectionsModule,
  CredentialsModule,
  DifPresentationExchangeProofFormatService,
  MediationRecipientModule,
  MediatorPickupStrategy,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
  DidsModule,
} from '@credo-ts/core'
import { IndyVdrAnonCredsRegistry, IndyVdrModule, IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import { PushNotificationsApnsModule, PushNotificationsFcmModule } from '@credo-ts/push-notifications'
import { useAgent } from '@credo-ts/react-hooks'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'
import { IndyVdrProxyAnonCredsRegistry, IndyVdrProxyDidResolver, CacheSettings } from 'credo-ts-indy-vdr-proxy-client'

interface GetAgentModulesOptions {
  indyNetworks: IndyVdrPoolConfig[]
  mediatorInvitationUrl?: string
  txnCache?: { capacity: number; expiryOffsetMs: number; path?: string }
  proxyBaseUrl?: string
  proxyCacheSettings?: CacheSettings
}

export type BifoldAgent = Agent<ReturnType<typeof getAgentModules>>

/**
 * Constructs the modules to be used in the agent setup
 * @param indyNetworks
 * @param mediatorInvitationUrl determine which mediator to use
 * @param txnCache optional local cache config for indyvdr
 * @param proxyBaseUrl optional indy vdr proxy url to sidestep ZMQ firewall issues
 * @param proxyCacheSettings optional cache settings for the proxy
 * @returns modules to be used in agent setup
 */
export function getAgentModules({
  indyNetworks,
  mediatorInvitationUrl,
  txnCache,
  proxyBaseUrl,
  proxyCacheSettings,
}: GetAgentModulesOptions) {
  const indyCredentialFormat = new LegacyIndyCredentialFormatService()
  const indyProofFormat = new LegacyIndyProofFormatService()

  if (txnCache) {
    indyVdr.setLedgerTxnCache({
      capacity: txnCache.capacity,
      expiry_offset_ms: txnCache.expiryOffsetMs,
      path: txnCache.path,
    })
  }

  const modules = {
    askar: new AskarModule({
      ariesAskar,
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: indyNetworks as [IndyVdrPoolConfig],
    }),
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
    }),
    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V1CredentialProtocol({ indyCredentialFormat }),
        new V2CredentialProtocol({
          credentialFormats: [
            indyCredentialFormat,
            new AnonCredsCredentialFormatService(),
            new DataIntegrityCredentialFormatService(),
          ],
        }),
      ],
    }),
    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
      proofProtocols: [
        new V1ProofProtocol({ indyProofFormat }),
        new V2ProofProtocol({
          proofFormats: [
            indyProofFormat,
            new AnonCredsProofFormatService(),
            new DifPresentationExchangeProofFormatService(),
          ],
        }),
      ],
    }),
    mediationRecipient: new MediationRecipientModule({
      mediatorInvitationUrl: mediatorInvitationUrl,
      mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    }),
    pushNotificationsFcm: new PushNotificationsFcmModule(),
    pushNotificationsApns: new PushNotificationsApnsModule(),
  }

  if (proxyBaseUrl) {
    return {
      ...modules,
      anoncreds: new AnonCredsModule({
        anoncreds,
        registries: [new IndyVdrProxyAnonCredsRegistry({ proxyBaseUrl, cacheOptions: proxyCacheSettings })],
      }),
      dids: new DidsModule({
        resolvers: [new IndyVdrProxyDidResolver(proxyBaseUrl)],
      }),
    }
  } else {
    return {
      ...modules,
      anoncreds: new AnonCredsModule({
        anoncreds,
        registries: [new IndyVdrAnonCredsRegistry()],
      }),
    }
  }
}

interface MyAgentContextInterface {
  loading: boolean
  agent?: BifoldAgent
  setAgent: (agent?: BifoldAgent) => void
}

export const useAppAgent = useAgent as () => MyAgentContextInterface

export const createLinkSecretIfRequired = async (agent: Agent) => {
  // If we don't have any link secrets yet, we will create a
  // default link secret that will be used for all anoncreds
  // credential requests.
  const linkSecretIds = await agent.modules.anoncreds.getLinkSecretIds()
  if (linkSecretIds.length === 0) {
    await agent.modules.anoncreds.createLinkSecret({
      setAsDefault: true,
    })
  }
}

/*
Type 
'import("/Users/brycem/work/bc-wallet-mobile-dep-upgrade/bifold/packages/legacy/core/node_modules/@credo-ts/core/build/agent/context/AgentContext").AgentContext' 
is not assignable to type 
'import("/Users/brycem/work/bc-wallet-mobile-dep-upgrade/bifold/packages/legacy/core/node_modules/@credo-ts/anoncreds/node_modules/@credo-ts/core/build/agent/context/AgentContext").AgentContext'.

*/

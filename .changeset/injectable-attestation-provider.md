---
'@bifold/expo-attestation': major
'@bifold/core': major
---

Make platform attestation injectable so consumers are not forced to depend on Expo.

`@bifold/core` no longer imports `@expo/app-integrity` or `expo-crypto`. The platform
half of attestation now goes through a new `AttestationProvider` interface, registered
on the container as `TOKENS.ATTESTATION_PROVIDER`. The network half
(`FN_ATTESTATION_GET_CHALLENGE` / `FN_ATTESTATION_GET_JWT`) is unchanged.

The Expo implementation moves to a new package, `@bifold/expo-attestation`.

BREAKING: apps with `enableAttestation: true` must now register a provider. Core
registers a stub that throws with instructions, because defaulting to a real provider
would reintroduce the native dependency this change removes — and with it, Expo's iOS
deployment floor.

```ts
import { expoAttestationProvider } from '@bifold/expo-attestation'

container.registerInstance(TOKENS.ATTESTATION_PROVIDER, expoAttestationProvider)
```

Apps that do not enable attestation are unaffected; `enableAttestation` defaults to
`false` and the hook returns before touching the provider.

Also fixes a latent bug: `isHardwareAttestationSupportedAsync` was used as a truthy
value rather than called, so the Android support check never fired.

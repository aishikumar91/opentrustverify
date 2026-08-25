# SDK Guide

## TypeScript

```ts
import { OpenTrustVerify } from "@otv/sdk-core";
const otv = new OpenTrustVerify({ baseUrl: "http://localhost:4080", apiKey: "..." });
const result = await otv.verifyIncomingTransfer({ ... });
```

## React

```ts
import { useIncomingVerification } from "@otv/sdk-react";
```

## Flutter

Stub — see `packages/sdk-flutter`.

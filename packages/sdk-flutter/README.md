# sdk-flutter

Dart HTTP client for OpenTrust Verify. Wallets should treat this as an additive
verification call — raw chain activity is never spendability.

```dart
import 'package:open_trust_verify/open_trust_verify.dart';

final otv = OpenTrustVerify(
  baseUrl: 'https://api.verify.poptrust.me',
  apiKey: Platform.environment['OTV_API_KEY']!,
);

final verdict = await otv.verifyIncomingTransfer(
  chain: 'ethereum',
  network: 'mainnet',
  transactionHash: hash,
  recipient: userAddress,
  asset: {'type': 'erc20', 'contract': usdc, 'symbol': 'USDC'},
  expectedAmount: amount,
);
```

Map `status` using `WALLET_INTEGRATION.md`. Do not ship signing keys in the app.

```bash
cd packages/sdk-flutter
dart pub get
```

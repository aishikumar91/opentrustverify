import 'dart:convert';

import 'package:http/http.dart' as http;

/// Minimal Dart client for OpenTrust Verify.
///
/// Production signing keys stay on the server. This client only calls the HTTP API.
class OpenTrustVerify {
  OpenTrustVerify({
    required this.baseUrl,
    required this.apiKey,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final String apiKey;
  final http.Client _client;

  Future<Map<String, dynamic>> verifyIncomingTransfer({
    required String chain,
    required String network,
    required String transactionHash,
    required String recipient,
    Map<String, dynamic>? asset,
    String? expectedAmount,
  }) async {
    final uri = Uri.parse('$baseUrl/v1/verify/incoming');
    final res = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $apiKey',
      },
      body: jsonEncode({
        'chain': chain,
        'network': network,
        'transactionHash': transactionHash,
        'recipient': recipient,
        if (asset != null) 'asset': asset,
        if (expectedAmount != null) 'expectedAmount': expectedAmount,
      }),
    );
    if (res.statusCode >= 400) {
      throw OtvException(res.statusCode, res.body);
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getVerdict(String id) async {
    final uri = Uri.parse('$baseUrl/v1/verdicts/$id');
    final res = await _client.get(uri);
    if (res.statusCode >= 400) {
      throw OtvException(res.statusCode, res.body);
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> health() async {
    final uri = Uri.parse('$baseUrl/v1/health');
    final res = await _client.get(uri);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}

class OtvException implements Exception {
  OtvException(this.statusCode, this.body);
  final int statusCode;
  final String body;

  @override
  String toString() => 'OtvException($statusCode): $body';
}

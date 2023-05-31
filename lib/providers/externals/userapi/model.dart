class ApiEndpoint {
  final String url;
  final String method;
  final String description;
  final bool requiresAuthentication;

  ApiEndpoint({
    required this.url,
    required this.method,
    required this.description,
    this.requiresAuthentication = false,
  });
}
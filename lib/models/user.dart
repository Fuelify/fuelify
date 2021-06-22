class User {
  int userId;
  String name;
  String email;
  String phone;
  String type;
  String token;
  String refreshToken;

  User({ 
    this.userId = 0, 
    this.name = "", 
    this.email = "",
    this.phone = "",
    this.type = "",
    this.token = "",
    this.refreshToken = "",
  });

  factory User.fromJson(Map<String, dynamic> responseData) {
    return User(
        userId: responseData['id'],
        name: responseData['name'] ?? "Joe Smith",
        email: responseData['email'],
        phone: responseData['phone'] ?? "315-988-5689",
        type: responseData['type'],
        token: responseData['access_token'],
        refreshToken: responseData['refresh_token']
    );
  }
}
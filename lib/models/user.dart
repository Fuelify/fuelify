class User {
  String id;
  String name;
  String email;
  String phone;
  String image;
  String type;
  String token;
  String refreshToken;

  User({
    this.id = "",
    this.name = "",
    this.email = "",
    this.phone = "",
    this.image = "",
    this.type = "",
    this.token = "",
    this.refreshToken = "",
  });

  factory User.fromJson(Map<String, dynamic> responseData) {
    print(responseData);
    return User(
        id: responseData['id'],
        name: responseData['name'] ?? "Joe Smith",
        email: responseData['email'],
        phone: responseData['phone'] ?? "315-988-5689",
        image: responseData['image'] ??
            "https://images.unsplash.com/photo-1554151228-14d9def656e4?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=333&q=80", //TODO UDPATE THIS TO DEFAULT EMPTY ICON
        type: responseData['type'] ?? "USER",
        token: responseData['access_token'],
        refreshToken: responseData['refresh_token']);
  }
}

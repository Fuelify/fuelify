class User {
  String id;
  String name;
  String email;
  String phone;
  String image;
  String type;
  String token;
  String refreshToken;

  Authentication authentication = Authentication(id: "", email:"", token: "", refreshToken: "");
  Profile profile = Profile();
  Preferences preferences = Preferences();

  User({
    this.id = "",
    this.name = "",
    this.email = "",
    this.phone = "",
    this.image = "",
    this.type = "",
    this.token = "",
    this.refreshToken = "",
    //this.authentication = Authentication(type: "User", id:"", email: "", token: "", refreshToken: ""),
  });

  factory User.fromJson(Map<String, dynamic> responseData) {
    
    return User(
        id: responseData['id'],
        name: responseData['name'] ?? "Joe Smith",
        email: responseData['email'],
        phone: responseData['phone'] ?? "315-988-5689",
        image: responseData['image'] ??
            "https://images.unsplash.com/photo-1554151228-14d9def656e4?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=333&q=80", //TODO UDPATE THIS TO DEFAULT EMPTY ICON

        //authentication: Authentication(token: responseData['access_token'], refreshToken: responseData['refresh_token']),
        type: responseData['type'] ?? "USER",
        token: responseData['access_token'],
        refreshToken: responseData['refresh_token']);
  }

  factory User.setAuthentication(Map<String, dynamic> authData, User user) {
    
    user.authentication = Authentication.fromJson(authData);
    return user;
  }

  factory User.setProfile(Map<String, dynamic> profileData, User user) {
    
    user.profile = Profile.fromJson(profileData);
    return user;
  }

  factory User.setPreferences(Map<String, dynamic> preferenceData, User user) {
    
    user.preferences = Preferences.fromJson(preferenceData);
    return user;
  }
}


class Authentication {
  String id;
  String email;
  String? type;
  String token;
  String refreshToken;

  Authentication({
    required this.id,
    required this.email,
    this.type,
    required this.token,
    required this.refreshToken,
  });

  factory Authentication.fromJson(Map<String, dynamic> data) {
    return Authentication(
      id: data['id'],
      email: data['email'],
      type: data['type'] ?? "USER",
      token: data['access_token'],
      refreshToken: data['refresh_token']);
  }
}

class Profile {
  String? firstName;
  String? lastName;
  String? image;
  String? location;
  double? height;
  double? weight;
  String? birthdate;
  String? gender;
  String? genderDesc;
  String? diet;
  String? activeness;
  Map? goalsHealth;
  Map? goalsWeight;
  Map? shopping;

  Profile({
    this.firstName,
    this.lastName,
    this.image,
    this.location,
    this.height,
    this.weight,
    this.birthdate,
    this.gender,
    this.genderDesc,
    this.diet,
    this.activeness,
    this.goalsHealth,
    this.goalsWeight,
    this.shopping,
  });

  factory Profile.fromJson(Map<String, dynamic> data) {
    return Profile(
      firstName: data['name']['first'],
      lastName: data['name']['last'],
      image: data['image'] ?? "https://images.unsplash.com/photo-1554151228-14d9def656e4?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=333&q=80", //TODO UDPATE THIS TO DEFAULT EMPTY ICON
      location: data['location'],
      height: data['height'],
      birthdate: data['birthdate'],
      gender: data['gender'],
      genderDesc: data['genderdesc'],
      diet: data['diet'],
      activeness: data['activeness'],
      goalsHealth: data['goals']['health'], // --> {all, primary}
      goalsWeight: data['goals']['weight'], // --> {target, weekly}
      shopping: data['shopping'] // --> {tendency, priceSensitivity, budget}
    );
  }
}

class Preferences {
  bool? darkMode;
  String? units;

  Preferences({
    this.darkMode,
    this.units,
  });

  factory Preferences.fromJson(Map<String, dynamic> data) {
    return Preferences(
      darkMode: data['darkMode'],
      units: data['units'],
    );
  }
}
class Onboarding {
  String personal;
  String diet;
  String devices;

  Onboarding({ 
    this.personal = "", 
    this.diet = "", 
    this.devices = "", 
  });

  factory Onboarding.fromJson(Map<String, dynamic> responseData) {
    return Onboarding(
        personal: responseData['personal'] ?? "",
        diet: responseData['diet'] ?? "",
        devices: responseData['devices'] ?? "",
    );
  }
}
// API Endpoints
class AppUrl {
  static const String liveBaseURL = "http://18.117.207.252"; //"https://user.fuelifyyourlife.com";
  static const String localBaseURL = "http://localhost:3000";

  static const String base = liveBaseURL; //localBaseURL
  static const String login = base + "/login";
  static const String register = base + "/register";
  static const String forgotPassword = base + "/forgot-password";
  static const String testToken = base + "/tokentest";
  static const String fetchFoods = base + "/foods/fetch?limit=10";
}

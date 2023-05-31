// API Endpoints
class AppUrl {
  static const String liveBaseURL = "http://18.117.207.252"; //"https://user.fuelifyyourlife.com";
  static const String localBaseURL = "http://localhost:3000"; //"http://192.168.1.79:3000";

  static const String base = localBaseURL; //liveBaseURL
  static const String login = base + "/user/login";
  static const String register = base + "/user/register";
  static const String forgotPassword = base + "/forgot-password";
  static const String testToken = base + "/tokentest";

  /*
    User Endpoints
  */
  static const String userUpdateProfile = base + "/user/profile/update";
  static const String userUpdateOnboardingState = base + "/user/state/onboarding";

  static const String fetchFoods = base + "/foods/fetch?limit=10";
}
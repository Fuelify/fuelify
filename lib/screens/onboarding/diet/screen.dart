import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:fuelify/screens/onboarding/controller.dart';

import 'package:fuelify/dependencies/user_preferences.dart';

import 'package:fuelify/widgets/buttons.dart';

class DietUpdateScreen extends ConsumerStatefulWidget {
  const DietUpdateScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<DietUpdateScreen> createState() => _DietUpdateScreenState();
}

class _DietUpdateScreenState extends ConsumerState<DietUpdateScreen> {
  final List<Map<String, dynamic>> _dataOptions = [
    {
      "Title": "Omnivore",
      "ImageUrl": "assets/onboarding/diet/omnivore.jpeg",
    },
    {
      "Title": "Pescatarian",
      "ImageUrl": "assets/onboarding/diet/pescatarian.jpeg",
    },
    {
      "Title": "Vegetarian",
      "ImageUrl": "assets/onboarding/diet/vegetarian.jpeg",
    },
    {
      "Title": "Vegan",
      "ImageUrl": "assets/onboarding/diet/vegan.jpeg",
    },
    {
      "Title": "Raw",
      "ImageUrl": "assets/onboarding/diet/raw.jpeg",
    },
    {
      "Title": "Other",
      "ImageUrl": null,
    },
  ];

  int? selectedOption;
  
  @override
  void initState() {
    UserProfile().getDietData().then(initializeDietData);
    super.initState();
  }

  void initializeDietData(String? diet) {
    setState(() {
      this.selectedOption = diet != null ? _dataOptions.indexWhere((option) => option['Title'] == diet) : null;
    });
  }

  @override
  Widget build(BuildContext context) {

    double deviceCardHeight = 125;
    double deviceCardWidth = MediaQuery.of(context).size.width / 3;

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Column(
            children: [
              Container(
                width: double.infinity,
                child: Padding(
                  padding: const EdgeInsets.only(
                      left: 20.0, right: 20.0, top: 20.0, bottom: 10.0),
                  child: Text(
                    "Choose your dietary preference:",
                    style: TextStyle(
                      color: Colors.grey[850],
                      fontWeight: FontWeight.bold,
                      fontSize: 18.0,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GridView.builder(
                  padding: const EdgeInsets.only(
                    left: 20,
                    right: 20,
                    top: 20,
                    bottom: 75
                  ),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisSpacing: 20,
                    mainAxisSpacing: 20,
                    crossAxisCount: 2,
                    childAspectRatio: (deviceCardWidth / deviceCardHeight),
                  ),
                  itemCount: _dataOptions.length,
                  itemBuilder: (context, index) {
                    return DietCardWidget(
                      context,
                      index,
                      _dataOptions[index]['Title'] ?? "Title",
                      _dataOptions[index]['ImageUrl'],
                      Colors.tealAccent,
                      Colors.white,
                    );
                  }
                )
              ),
              const SizedBox(height: 40),
            ],
          ),
          FullWidthOverlayButtonWidget(
            text: "Continue",
            onClicked: () {
              ref.read(onboardingNavigationProgressControllerProvider.notifier).onContinueTapped(ref);
            },
          ),
        ]
      )
    );
  }
    
  /*class DietCardWidget extends StatelessWidget {
    final context;
    final index;
    final dietName;
    final dietImage;
    final colorSelected;
    final colorUnselected;
    final onSelect;

    const DietCardWidget({
      Key? key,
      this.context,
      this.index,
      this.dietName,
      this.dietImage,
      this.colorSelected,
      this.colorUnselected,
      this.onSelect,
    }) : super(key: key);

    @override
    Widget build(BuildContext context) {*/
  Widget DietCardWidget(
    BuildContext context,
    int index,
    String dietName,
    String? dietImage, // not required
    Color? colorSelected, // not required
    Color? colorUnselected, // not required
  ) {
    return GestureDetector(
      onTap: () {
        print('Selected ' + dietName);
        setState(() {
          selectedOption = index;
        });
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          boxShadow: const [
            BoxShadow(color: Colors.black38, spreadRadius: 0.5, blurRadius: 2.5),
          ],
          color: selectedOption == index ? colorSelected != null ? colorSelected: Colors.transparent : colorUnselected != null ? colorUnselected : Colors.transparent,
        ),
        child: Column(
          children: [
            Flexible(
              flex: 7,
              child: Container(
                height: double.infinity,
                padding: const EdgeInsets.only(left: 4, right: 4, top: 4, bottom: 0),
                child: dietImage != null
                    ? Image(
                        image: AssetImage(dietImage),
                        fit: BoxFit.contain,
                      )
                    : null,
              )
            ),
            Flexible(
              flex: 2,
              child: Container(
                height: double.infinity,
                padding: const EdgeInsets.only(left: 10, right: 10, top: 0, bottom: 4),
                child: Text(
                  dietName,
                  style: const TextStyle(color: Colors.grey),
                  textAlign: TextAlign.center,
                )
              )
            )
          ]
        )
      ),
    );
  }
}
import 'package:flutter/material.dart';

class DropDownWidget extends StatefulWidget {
  const DropDownWidget({Key? key}) : super(key: key);

  @override
  _DropDownWidgetState createState() => _DropDownWidgetState();
}

class _DropDownWidgetState extends State<DropDownWidget> {
  bool isDropDownOpened = false;
  String dropdownValue = 'One';

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey),
            color: Colors.white,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
          // dropdown below..
          child: DropdownButtonFormField<String>(
            decoration: InputDecoration(
              enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.white))),
            value: dropdownValue,
            icon: const Icon(Icons.arrow_drop_down),
            iconSize: 24,
            elevation: 16,
            style: TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.w400
            ),
            focusColor: Colors.green,
            dropdownColor: Colors.white,
            onChanged: (String? newValue) {
              setState(() {
                dropdownValue = newValue!;
              });
            },
            items: <String>['One', 'Two', 'Free', 'Four']
                .map<DropdownMenuItem<String>>((String value) {
              return DropdownMenuItem<String>(
                value: value,
                child: Text(value), // Make this a separate customised class
              );
            }).toList(),
          )
        )
      ],
    );
  }
}

///
///
///

class CustomDropDownWidget extends StatefulWidget {
  final String text;

  const CustomDropDownWidget({Key? key, required this.text}) : super(key: key);

  @override
  _CustomDropDownWidgetState createState() => _CustomDropDownWidgetState();
}

class _CustomDropDownWidgetState extends State<CustomDropDownWidget> {
  late GlobalKey actionKey;
  double height = 0, width = 0, xPosition = 0, yPosition = 0;
  bool isDropdownOpened = false;
  late OverlayEntry floatingDropdown;

  @override
  void initState() {
    actionKey = LabeledGlobalKey(widget.text);
    super.initState();
  }

  void findDropdownData() {
    RenderBox renderBox =
        actionKey.currentContext!.findRenderObject() as RenderBox;
    height = renderBox.size.height;
    width = renderBox.size.width;
    Offset offset = renderBox.localToGlobal(Offset.zero);
    xPosition = offset.dx;
    yPosition = offset.dy;
    print(height);
    print(width);
    print(xPosition);
    print(yPosition);
  }

  OverlayEntry _createFloatingDropdown() {
    return OverlayEntry(builder: (context) {
      return Positioned(
        left: xPosition,
        width: width,
        top: yPosition + height,
        height: 4 * height + 25,
        child: DropDown(
          itemHeight: height,
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: actionKey,
      onTap: () {
        setState(() {
          if (isDropdownOpened) {
            floatingDropdown.remove();
          } else {
            findDropdownData();
            floatingDropdown = _createFloatingDropdown();
            Overlay.of(context)!.insert(floatingDropdown);
          }

          isDropdownOpened = !isDropdownOpened;
        });
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey),
          color: Colors.white,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: <Widget>[
            Text(
              widget.text,
              style: TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.w400),
            ),
            Spacer(),
            Icon(
              Icons.arrow_drop_down,
              color: Colors.grey[600],
            ),
          ],
        ),
      ),
    );
  }
}

class DropDown extends StatelessWidget {
  final double itemHeight;

  const DropDown({Key? key, required this.itemHeight}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        SizedBox(
          height: 5,
        ),
        Material(
          color: Colors.transparent,
          elevation: 20,
          child: Container(
            //height: 4 * itemHeight,
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(width: 1.0, color: Colors.grey)),
            child: Column(
              children: <Widget>[
                DropDownItems.first(
                  text: "Male",
                  iconData: Icons.male,
                  isSelected: false,
                ),
                DropDownItems(
                  text: "Female",
                  iconData: Icons.female,
                  isSelected: false,
                ),
                DropDownItems(
                  text: "Prefer not to say",
                  iconData: Icons.not_interested,
                  isSelected: false,
                ),
                DropDownItems.last(
                  text: "Prefer to self describe",
                  iconData: Icons.exit_to_app,
                  isSelected: true,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class DropDownItems extends StatelessWidget {
  final String text;
  final IconData iconData;
  final bool isSelected;
  final bool isFirstItem;
  final bool isLastItem;

  const DropDownItems(
      {Key? key,
      required this.text,
      required this.iconData,
      this.isSelected = false,
      this.isFirstItem = false,
      this.isLastItem = false})
      : super(key: key);

  factory DropDownItems.first(
      {required String text,
      required IconData iconData,
      required bool isSelected}) {
    return DropDownItems(
      text: text,
      iconData: iconData,
      isSelected: isSelected,
      isFirstItem: true,
    );
  }

  factory DropDownItems.last(
      {required String text,
      required IconData iconData,
      required bool isSelected}) {
    return DropDownItems(
      text: text,
      iconData: iconData,
      isSelected: isSelected,
      isLastItem: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.vertical(
            top: isFirstItem ? Radius.circular(8) : Radius.zero,
            bottom: isLastItem ? Radius.circular(8) : Radius.zero,
          ),
          color: isSelected ? Colors.grey[200] : Colors.white,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: GestureDetector(
          onTap: () {
            print('Tapped' + text);
          },
          child: Row(
            children: <Widget>[
              Text(
                text,
                style: TextStyle(
                    color: Colors.black,
                    fontSize: 16,
                    fontWeight: FontWeight.w400),
              ),
              Spacer(),
              Icon(
                iconData,
                color: Colors.grey[600],
              ),
            ],
          ),
        ));
  }
}
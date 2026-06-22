const React = require('react');

function MockIcon() { return null; }
MockIcon.glyphMap = {};
MockIcon.font = {};

module.exports = {
  MaterialIcons: MockIcon,
  Ionicons: MockIcon,
  FontAwesome: MockIcon,
  AntDesign: MockIcon,
  Entypo: MockIcon,
  Feather: MockIcon,
  FontAwesome5: MockIcon,
};

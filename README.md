# Food Journal App

A React Native app built with Expo that allows users to document their meals by taking photos, adding descriptions, and categorizing entries. Users can register, log in/out, browse, edit, and delete their food journals.

---

## Features

- User authentication (register, login, logout)
- Capture photos using the device camera
- Select images from the device gallery
- Add descriptions for food and drinks
- Browse journal entries with swipe gestures
- Filter journal entries by meal category (Breakfast, Lunch, Dinner, Snacks, All)
- Edit and delete existing journal entries
- Local SQLite database storage for persistent data

---

## Getting Started

### Prerequisites

- Node.js >= 16.x
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

---

### Installation

1. Clone the repo:

2. expo install expo-camera expo-image-picker expo-permissions expo-sqlite react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context @react-native-community/masked-view

3. npm install @react-navigation/native @react-navigation/stack react-native-swipe-list-view prop-types @react-native-picker/picker

```bash
git clone https://github.com/JAulds/Week11-15.git
cd food-journal-app

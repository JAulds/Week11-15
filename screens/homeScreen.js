import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { SwipeListView } from "react-native-swipe-list-view";
import { executeSql } from "../components/database/database";
import { Picker } from "@react-native-picker/picker";

const HomeScreen = ({ route }) => {
  // State management
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const cameraRef = useRef(null); // <-- useRef instead of useState for camera ref
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [journals, setJournals] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [category, setCategory] = useState("All");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Categories for filtering
  const categories = ["All", "Breakfast", "Lunch", "Dinner", "Snacks"];

  // Initialize camera and load journals
  useEffect(() => {
    const initialize = async () => {
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === "granted");

      // Load journal entries
      await loadJournals();
      setIsLoading(false);
    };

    initialize();
  }, []);

  // Load journals from database
  const loadJournals = async () => {
    try {
      const userId = route.params?.userId;
      if (!userId) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const result = await executeSql(
        "SELECT * FROM journals WHERE userId = ? ORDER BY date DESC",
        [userId]
      );

      setJournals(result.rows._array || []);
    } catch (error) {
      console.error("Error loading journals:", error);
      Alert.alert("Error", "Failed to load journals");
    }
  };

  // Take picture with camera
  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      setImage(photo.uri);
      setIsCameraOpen(false);
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take picture");
    }
  };

  // Select image from gallery
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow access to your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  // Save or update journal entry
  const saveJournal = async () => {
    if (!image || !description.trim()) {
      Alert.alert(
        "Validation Error",
        "Please add both an image and description"
      );
      return;
    }

    try {
      const userId = route.params?.userId;
      if (!userId) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      if (editingId) {
        // Update existing entry
        await executeSql(
          "UPDATE journals SET image = ?, description = ?, category = ? WHERE id = ?",
          [image, description.trim(), category, editingId]
        );
        Alert.alert("Success", "Journal updated successfully");
      } else {
        // Create new entry
        await executeSql(
          "INSERT INTO journals (userId, image, description, category, date) VALUES (?, ?, ?, ?, ?)",
          [
            userId,
            image,
            description.trim(),
            category,
            new Date().toISOString(),
          ]
        );
        Alert.alert("Success", "Journal saved successfully");
      }

      await loadJournals();
      resetForm();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  // Delete journal entry
  const deleteJournal = async (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this journal entry?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await executeSql("DELETE FROM journals WHERE id = ?", [id]);
              await loadJournals();
              Alert.alert("Success", "Journal deleted successfully");
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete journal");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Reset form fields
  const resetForm = () => {
    setImage(null);
    setDescription("");
    setEditingId(null);
    setCategory("All");
  };

  // Filter journals by category
  const filteredJournals =
    category === "All"
      ? journals
      : journals.filter((item) => item.category === category);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading your food journals...</Text>
      </View>
    );
  }

  // Camera permission denied
  if (hasCameraPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Camera permission is required to take photos</Text>
        <Button
          title="Grant Permission"
          onPress={() => Camera.requestCameraPermissionsAsync()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Camera Modal */}
      <Modal visible={isCameraOpen} animationType="slide">
        <View style={styles.cameraContainer}>
          <Camera style={styles.camera} ref={cameraRef} ratio="16:9" />
          <View style={styles.cameraButtons}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <Button
              title="Close"
              onPress={() => setIsCameraOpen(false)}
              color="#ff4444"
            />
          </View>
        </View>
      </Modal>

      {/* Journal Input Section */}
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>
          {editingId ? "Edit Journal Entry" : "Add New Journal Entry"}
        </Text>

        {/* Image Preview */}
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text>No image selected</Text>
          </View>
        )}

        {/* Image Selection Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={() => setIsCameraOpen(true)}
          >
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.buttonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Description Input */}
        <TextInput
          placeholder="What did you eat? Add details..."
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          multiline
          numberOfLines={3}
        />

        {/* Category Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Category:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Save/Update Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveJournal}>
          <Text style={styles.saveButtonText}>
            {editingId ? "Update Journal" : "Save Journal"}
          </Text>
        </TouchableOpacity>

        {/* Cancel Edit Button (visible only when editing) */}
        {editingId && (
          <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Journal List Section */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Your Food Journals</Text>

        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by:</Text>
          <View style={styles.filterPickerWrapper}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.filterPicker}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Journal List */}
        {filteredJournals.length > 0 ? (
          <SwipeListView
            data={filteredJournals}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.journalItem}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.journalImage}
                />
                <View style={styles.journalTextContainer}>
                  <Text style={styles.journalDescription}>
                    {item.description}
                  </Text>
                  <Text style={styles.journalCategory}>{item.category}</Text>
                </View>
                <View style={styles.journalButtons}>
                  <Button
                    title="Edit"
                    onPress={() => {
                      setEditingId(item.id);
                      setImage(item.image);
                      setDescription(item.description);
                      setCategory(item.category);
                    }}
                    color="#007bff"
                  />
                  <Button
                    title="Delete"
                    onPress={() => deleteJournal(item.id)}
                    color="#ff4444"
                  />
                </View>
              </View>
            )}
            disableRightSwipe={true}
            rightOpenValue={-75}
            previewRowKey={"0"}
            previewOpenValue={-40}
            previewOpenDelay={3000}
          />
        ) : (
          <Text style={styles.noJournalsText}>No journal entries found.</Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "flex-end",
  },
  camera: {
    flex: 1,
  },
  cameraButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    backgroundColor: "#00000088",
    alignItems: "center",
  },
  captureButton: {
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 50,
    height: 70,
    width: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    backgroundColor: "#fff",
    height: 50,
    width: 50,
    borderRadius: 25,
  },
  inputContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: "#f9f9f9",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 10,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  imageButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top",
    fontSize: 16,
    backgroundColor: "white",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "white",
  },
  picker: {
    height: 40,
    width: "100%",
  },
  saveButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    marginTop: 15,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: "#dc3545",
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
  },
  filterPickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "white",
  },
  filterPicker: {
    height: 40,
    width: "100%",
  },
  journalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fefefe",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  journalImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 10,
  },
  journalTextContainer: {
    flex: 1,
  },
  journalDescription: {
    fontWeight: "bold",
  },
  journalCategory: {
    color: "#777",
    marginTop: 4,
    fontStyle: "italic",
  },
  journalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 90,
  },
  noJournalsText: {
    textAlign: "center",
    color: "#777",
    marginTop: 20,
    fontStyle: "italic",
  },
});

export default HomeScreen;

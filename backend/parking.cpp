/*
    PARKING LOT MANAGEMENT SYSTEM - Core Logic (C++)
    ---------------------------------------------------
    This is a simple, beginner-friendly C++ program.
    It manages parking slots using a simple ARRAY of a Slot CLASS.

    HOW IT WORKS:
    - All parking data is stored in a text file: data/parking_data.txt
    - Every time this program runs, it loads data from the file,
      does ONE task (based on command line arguments), then
      saves data back to the file and prints a result.
    - The Node.js server (server.js) simply calls this program
      again and again with different arguments, and reads what
      this program prints. ALL the parking logic (deciding slots,
      calculating fees, searching vehicles) happens right here in C++.

    HOW TO RUN (examples from terminal, after compiling):
      ./parking status
      ./parking park PB10AB1234 Car
      ./parking exit PB10AB1234
      ./parking list
      ./parking search PB10AB1234
*/

#include <iostream>
#include <fstream>
#include <string>
#include <ctime>
using namespace std;

// Total number of parking slots in our parking lot
const int TOTAL_SLOTS = 10;

// Path to the data file where slot information is saved
const string DATA_FILE = "../data/parking_data.txt";

// Path to the history file where EVERY park/exit event is logged
// (this file is never overwritten, only appended to, so it becomes
// a full history log we can later export as an Excel/CSV sheet)
const string HISTORY_FILE = "../data/parking_history.txt";

// ---------------------------------------------------------
// A simple class that represents ONE parking slot
// ---------------------------------------------------------
class Slot {
public:
    int slotNumber;        // slot number (1 to TOTAL_SLOTS)
    bool isOccupied;        // true = car is parked here, false = empty
    string vehicleNumber;   // e.g. "PB10AB1234"
    string vehicleType;     // e.g. "Car", "Bike", "Truck"
    long entryTime;         // time when vehicle entered (in seconds)

    // Simple constructor - by default a slot is empty
    Slot() {
        slotNumber = 0;
        isOccupied = false;
        vehicleNumber = "-";
        vehicleType = "-";
        entryTime = 0;
    }
};

// ---------------------------------------------------------
// A simple class that manages ALL the parking slots
// ---------------------------------------------------------
class ParkingLot {
public:
    Slot slots[TOTAL_SLOTS];   // simple array of slots (basic DSA!)

    // Fill slot numbers 1 to TOTAL_SLOTS
    void setupEmptySlots() {
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            slots[i].slotNumber = i + 1;
            slots[i].isOccupied = false;
            slots[i].vehicleNumber = "-";
            slots[i].vehicleType = "-";
            slots[i].entryTime = 0;
        }
    }

    // Load slot data from the text file into the array
    // If the file does not exist, create fresh empty slots
    void loadData() {
        setupEmptySlots(); // start with empty slots first

        ifstream inFile(DATA_FILE.c_str());
        if (!inFile) {
            // File does not exist yet, so we just keep empty slots
            return;
        }

        int slotNumber;
        int occupiedFlag;
        string vehicleNumber, vehicleType;
        long entryTime;

        // Read line by line: slotNumber occupiedFlag vehicleNumber vehicleType entryTime
        while (inFile >> slotNumber >> occupiedFlag >> vehicleNumber >> vehicleType >> entryTime) {
            int index = slotNumber - 1; // array index starts from 0
            if (index >= 0 && index < TOTAL_SLOTS) {
                slots[index].slotNumber = slotNumber;
                slots[index].isOccupied = (occupiedFlag == 1);
                slots[index].vehicleNumber = vehicleNumber;
                slots[index].vehicleType = vehicleType;
                slots[index].entryTime = entryTime;
            }
        }
        inFile.close();
    }

    // Save the current slot array back into the text file
    void saveData() {
        ofstream outFile(DATA_FILE.c_str());
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            outFile << slots[i].slotNumber << " "
                    << (slots[i].isOccupied ? 1 : 0) << " "
                    << slots[i].vehicleNumber << " "
                    << slots[i].vehicleType << " "
                    << slots[i].entryTime << endl;
        }
        outFile.close();
    }

    // Append ONE event line to the history file.
    // event is either "ENTRY" or "EXIT".
    // We use ios::app so old history lines are never erased.
    void logHistory(string event, string vehicleNumber, string vehicleType,
                     int slotNumber, long entryTime, long exitTime, int fee) {
        ofstream historyFile(HISTORY_FILE.c_str(), ios::app);
        historyFile << event << " "
                    << slotNumber << " "
                    << vehicleNumber << " "
                    << vehicleType << " "
                    << entryTime << " "
                    << exitTime << " "
                    << fee << endl;
        historyFile.close();
    }

    // Print the full history log (every ENTRY and EXIT ever recorded)
    // using the same pipe/comma format as listVehicles(), so it is
    // easy for the Node server to turn into JSON / CSV.
    void printHistory() {
        ifstream historyFile(HISTORY_FILE.c_str());
        if (!historyFile) {
            cout << endl; // no history yet, print empty line
            return;
        }

        string event, vehicleNumber, vehicleType;
        int slotNumber, fee;
        long entryTime, exitTime;
        bool first = true;

        while (historyFile >> event >> slotNumber >> vehicleNumber >> vehicleType
                            >> entryTime >> exitTime >> fee) {
            if (!first) {
                cout << "|";
            }
            cout << "EVENT=" << event
                 << ",SLOT=" << slotNumber
                 << ",VEHICLE=" << vehicleNumber
                 << ",TYPE=" << vehicleType
                 << ",ENTRY=" << entryTime
                 << ",EXIT=" << exitTime
                 << ",FEE=" << fee;
            first = false;
        }
        cout << endl;
        historyFile.close();
    }


    // Clear all history records
    void clearHistory() {
        ofstream historyFile(HISTORY_FILE.c_str(), ios::trunc);
        historyFile.close();

        cout << "SUCCESS;MESSAGE=History cleared" << endl;
    }

    // Find the first empty slot. Returns index, or -1 if lot is full.
    int findEmptySlot() {
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            if (slots[i].isOccupied == false) {
                return i;
            }
        }
        return -1; // no empty slot found
    }

    // Find slot index by vehicle number. Returns index, or -1 if not found.
    int findVehicle(string vehicleNumber) {
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            if (slots[i].isOccupied == true && slots[i].vehicleNumber == vehicleNumber) {
                return i;
            }
        }
        return -1; // vehicle not found
    }

    // Park a new vehicle. Prints the result in a simple format.
    void parkVehicle(string vehicleNumber, string vehicleType) {
        // First check the vehicle is not already parked
        if (findVehicle(vehicleNumber) != -1) {
            cout << "FAIL;MESSAGE=Vehicle already parked" << endl;
            return;
        }

        int index = findEmptySlot();
        if (index == -1) {
            cout << "FAIL;MESSAGE=Parking Full" << endl;
            return;
        }

        // Fill slot details
        slots[index].isOccupied = true;
        slots[index].vehicleNumber = vehicleNumber;
        slots[index].vehicleType = vehicleType;
        slots[index].entryTime = (long)time(0); // current time in seconds

        cout << "SUCCESS;SLOT=" << slots[index].slotNumber
             << ";VEHICLE=" << vehicleNumber
             << ";TYPE=" << vehicleType
             << ";ENTRY=" << slots[index].entryTime << endl;

        // Record this entry in the permanent history log
        logHistory("ENTRY", vehicleNumber, vehicleType,
                   slots[index].slotNumber, slots[index].entryTime, 0, 0);
    }

    // Calculate parking fee based on vehicle type and duration (in minutes)
    int calculateFee(string vehicleType, long durationMinutes) {
        int ratePerHour;

        // Simple if-else / switch style pricing rules
        if (vehicleType == "Bike") {
            ratePerHour = 10;
        } else if (vehicleType == "Car") {
            ratePerHour = 20;
        } else if (vehicleType == "Truck") {
            ratePerHour = 40;
        } else {
            ratePerHour = 15; // default rate for other vehicle types
        }

        // Round UP to the next hour (minimum charge = 1 hour)
        int hours = durationMinutes / 60;
        if (durationMinutes % 60 != 0) {
            hours = hours + 1;
        }
        if (hours == 0) {
            hours = 1; // minimum 1 hour charge
        }

        return hours * ratePerHour;
    }

    // Remove a vehicle (exit) and calculate the fee
    void exitVehicle(string vehicleNumber) {
        int index = findVehicle(vehicleNumber);
        if (index == -1) {
            cout << "FAIL;MESSAGE=Vehicle not found" << endl;
            return;
        }

        long entryTime = slots[index].entryTime;
        long currentTime = (long)time(0);
        long durationSeconds = currentTime - entryTime;
        long durationMinutes = durationSeconds / 60;

        int fee = calculateFee(slots[index].vehicleType, durationMinutes);
        int slotNumber = slots[index].slotNumber;
        string vehicleType = slots[index].vehicleType;

        // Free up the slot
        slots[index].isOccupied = false;
        slots[index].vehicleNumber = "-";
        slots[index].vehicleType = "-";
        slots[index].entryTime = 0;

        cout << "SUCCESS;SLOT=" << slotNumber
             << ";VEHICLE=" << vehicleNumber
             << ";TYPE=" << vehicleType
             << ";DURATION=" << durationMinutes
             << ";FEE=" << fee << endl;

        // Record this exit in the permanent history log
        logHistory("EXIT", vehicleNumber, vehicleType, slotNumber, entryTime, currentTime, fee);
    }

    // Print overall status: total, available, occupied slots
    void showStatus() {
        int occupiedCount = 0;
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            if (slots[i].isOccupied) {
                occupiedCount++;
            }
        }
        int availableCount = TOTAL_SLOTS - occupiedCount;

        cout << "TOTAL=" << TOTAL_SLOTS
             << ";AVAILABLE=" << availableCount
             << ";OCCUPIED=" << occupiedCount << endl;
    }

    // Print list of all currently parked vehicles
    void listVehicles() {
        bool first = true;
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            if (slots[i].isOccupied) {
                if (!first) {
                    cout << "|"; // separator between entries
                }
                cout << "SLOT=" << slots[i].slotNumber
                     << ",VEHICLE=" << slots[i].vehicleNumber
                     << ",TYPE=" << slots[i].vehicleType
                     << ",ENTRY=" << slots[i].entryTime;
                first = false;
            }
        }
        cout << endl; // if no vehicles, this just prints an empty line
    }

    // Search for one vehicle by number and print its slot details
    void searchVehicle(string vehicleNumber) {
        int index = findVehicle(vehicleNumber);
        if (index == -1) {
            cout << "FAIL;MESSAGE=Vehicle not found" << endl;
            return;
        }

        cout << "SUCCESS;SLOT=" << slots[index].slotNumber
             << ";VEHICLE=" << slots[index].vehicleNumber
             << ";TYPE=" << slots[index].vehicleType
             << ";ENTRY=" << slots[index].entryTime << endl;
    }
};

// ---------------------------------------------------------
// MAIN FUNCTION - reads command line arguments and calls
// the correct ParkingLot function.
// ---------------------------------------------------------
int main(int argc, char* argv[]) {

    ParkingLot lot;
    lot.loadData(); // always load latest data first

    if (argc < 2) {
        cout << "FAIL;MESSAGE=No command given" << endl;
        return 0;
    }

    string command = argv[1];

    if (command == "status") {
        lot.showStatus();
    }
    else if (command == "list") {
        lot.listVehicles();
    }
    else if (command == "park") {
        if (argc < 4) {
            cout << "FAIL;MESSAGE=Vehicle number and type required" << endl;
        } else {
            string vehicleNumber = argv[2];
            string vehicleType = argv[3];
            lot.parkVehicle(vehicleNumber, vehicleType);
            lot.saveData(); // save changes to file
        }
    }
    else if (command == "exit") {
        if (argc < 3) {
            cout << "FAIL;MESSAGE=Vehicle number required" << endl;
        } else {
            string vehicleNumber = argv[2];
            lot.exitVehicle(vehicleNumber);
            lot.saveData(); // save changes to file
        }
    }
    else if (command == "history") {
        lot.printHistory();
    }
    else if (command == "clearhistory") {
        lot.clearHistory();
    }
    else if (command == "search") {
        if (argc < 3) {
            cout << "FAIL;MESSAGE=Vehicle number required" << endl;
        } else {
            string vehicleNumber = argv[2];
            lot.searchVehicle(vehicleNumber);
        }
    }
    else {
        cout << "FAIL;MESSAGE=Unknown command" << endl;
    }

    return 0;
}

#include <iostream>
#include <fstream>
#include <string>
#include <ctime>
using namespace std;


const int TOTAL_SLOTS = 10;


const string DATA_FILE = "parking_data.txt";

class Slot {
public:
    int slotNumber;        
    bool isOccupied;        
    string vehicleNumber;   
    string vehicleType;     
    long entryTime;         

    Slot() {
        slotNumber = 0;
        isOccupied = false;
        vehicleNumber = "-";
        vehicleType = "-";
        entryTime = 0;
    }
};


class ParkingLot {
public:
    Slot slots[TOTAL_SLOTS];   


    void setupEmptySlots() {
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            slots[i].slotNumber = i + 1;
            slots[i].isOccupied = false;
            slots[i].vehicleNumber = "-";
            slots[i].vehicleType = "-";
            slots[i].entryTime = 0;
        }
    }

   
 void loadData() {
    setupEmptySlots();

    ifstream inFile(DATA_FILE.c_str());

    if (!inFile.is_open()) {
        ofstream createFile(DATA_FILE.c_str());
        createFile.close();
        return;
    }

    int slotNumber;
    int occupiedFlag;
    string vehicleNumber, vehicleType;
    long entryTime;

    while (inFile >> slotNumber >> occupiedFlag >> vehicleNumber >> vehicleType >> entryTime) {
        int index = slotNumber - 1;

        if (index >= 0 && index < TOTAL_SLOTS) {
            slots[index].slotNumber = slotNumber;
            slots[index].isOccupied = occupiedFlag;
            slots[index].vehicleNumber = vehicleNumber;
            slots[index].vehicleType = vehicleType;
            slots[index].entryTime = entryTime;
        }
    }

    inFile.close();
}

    void saveData() {

    ofstream outFile(DATA_FILE.c_str(), ios::trunc);

    for (int i = 0; i < TOTAL_SLOTS; i++) {

        outFile
            << slots[i].slotNumber << " "
            << slots[i].isOccupied << " "
            << slots[i].vehicleNumber << " "
            << slots[i].vehicleType << " "
            << slots[i].entryTime << endl;

    }

    outFile.close();
}

    int findEmptySlot() {
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            if (slots[i].isOccupied == false) {
                return i;
            }
        }
        return -1; 
    }

  
    int findVehicle(string vehicleNumber) {
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            if (slots[i].isOccupied == true && slots[i].vehicleNumber == vehicleNumber) {
                return i;
            }
        }
        return -1; 
    }

    
    void parkVehicle(string vehicleNumber, string vehicleType) {

        if (findVehicle(vehicleNumber) != -1) {
            cout << "FAIL;MESSAGE=Vehicle already parked" << endl;
            return;
        }

        int index = findEmptySlot();
        if (index == -1) {
            cout << "FAIL;MESSAGE=Parking Full" << endl;
            return;
        }

        
        slots[index].isOccupied = true;
        slots[index].vehicleNumber = vehicleNumber;
        slots[index].vehicleType = vehicleType;
        slots[index].entryTime = (long)time(0); 

        cout << "SUCCESS;SLOT=" << slots[index].slotNumber
             << ";VEHICLE=" << vehicleNumber
             << ";TYPE=" << vehicleType
             << ";ENTRY=" << slots[index].entryTime << endl;
    }

    
    int calculateFee(string vehicleType, long durationMinutes) {
        int ratePerHour;

        
        if (vehicleType == "Bike") {
            ratePerHour = 10;
        } else if (vehicleType == "Car") {
            ratePerHour = 20;
        } else if (vehicleType == "Truck") {
            ratePerHour = 40;
        } else {
            ratePerHour = 15;
        }

       
        int hours = durationMinutes / 60;
        if (durationMinutes % 60 != 0) {
            hours = hours + 1;
        }
        if (hours == 0) {
            hours = 1; 
        }

        return hours * ratePerHour;
    }

  
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

        
        slots[index].isOccupied = false;
        slots[index].vehicleNumber = "-";
        slots[index].vehicleType = "-";
        slots[index].entryTime = 0;

        cout << "SUCCESS;SLOT=" << slotNumber
             << ";VEHICLE=" << vehicleNumber
             << ";TYPE=" << vehicleType
             << ";DURATION=" << durationMinutes
             << ";FEE=" << fee << endl;
    }


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

    
    void listVehicles() {
        bool first = true;
        for (int i = 0; i < TOTAL_SLOTS; i++) {
            if (slots[i].isOccupied) {
                if (!first) {
                    cout << "|"; 
                }
                cout << "SLOT=" << slots[i].slotNumber
                     << ",VEHICLE=" << slots[i].vehicleNumber
                     << ",TYPE=" << slots[i].vehicleType
                     << ",ENTRY=" << slots[i].entryTime;
                first = false;
            }
        }
        cout << endl; 
    }

   
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


int main(int argc, char* argv[]) {

    ParkingLot lot;
    lot.loadData(); 

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
            lot.saveData(); 
        }
    }
    else if (command == "exit") {
        if (argc < 3) {
            cout << "FAIL;MESSAGE=Vehicle number required" << endl;
        } else {
            string vehicleNumber = argv[2];
            lot.exitVehicle(vehicleNumber);
            lot.saveData(); 
        }
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

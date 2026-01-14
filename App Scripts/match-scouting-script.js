/**
 * FRC 1792 Scouting Data Receiver - Google Apps Script (2026 REBUILT)
 * FIXED VERSION - Handles request object properly
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Save the project (Ctrl+S or Cmd+S)
 * 5. Click "Deploy" > "New deployment"
 * 6. Select type: "Web app"
 * 7. Execute as: "Me"
 * 8. Who has access: "Anyone"
 * 9. Click "Deploy" and authorize if needed
 * 10. Copy the Web app URL (ends with /exec)
 * 11. Replace WEBHOOK_URL in your HTML with this new URL
 */

// Configuration
const SHEET_NAME = "Match Scouting Data";

/**
 * Handle POST requests from the scouting app
 */
function doPost(e) {
  Logger.log("=== POST REQUEST RECEIVED ===");
  
  // Check if e exists
  if (!e) {
    Logger.log("ERROR: Request object (e) is undefined");
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "No request object received"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    Logger.log("Request object exists");
    
    let data;
    let rawData = "";
    
    // Method 1: Check parameter.payload (form-encoded)
    if (e.parameter && e.parameter.payload) {
      Logger.log("Found data in e.parameter.payload");
      rawData = e.parameter.payload;
      data = JSON.parse(rawData);
    }
    // Method 2: Check postData.contents
    else if (e.postData && e.postData.contents) {
      Logger.log("Found data in e.postData.contents");
      rawData = e.postData.contents;
      
      // Check if it's form-encoded
      if (rawData.indexOf("payload=") === 0) {
        rawData = decodeURIComponent(rawData.substring(8));
      }
      
      data = JSON.parse(rawData);
    }
    // Method 3: Try getting data as string
    else if (e.postData) {
      Logger.log("Trying e.postData directly");
      try {
        rawData = e.postData.getDataAsString ? e.postData.getDataAsString() : JSON.stringify(e.postData);
        
        // Check if it's form-encoded
        if (rawData.indexOf("payload=") === 0) {
          rawData = decodeURIComponent(rawData.substring(8));
        }
        
        data = JSON.parse(rawData);
      } catch (parseError) {
        Logger.log("Could not parse postData: " + parseError.toString());
        throw new Error("Could not parse postData");
      }
    }
    else {
      Logger.log("No data found in any expected location");
      throw new Error("No data received");
    }
    
    Logger.log("Data parsed successfully");
    Logger.log("Match: " + data.matchNumber + ", Team: " + data.teamNumber + ", Scout: " + data.studentName);
    
    // Write to sheet
    writeToSheet(data);
    
    Logger.log("✓ Data written to sheet successfully");
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Data recorded successfully",
        matchNumber: data.matchNumber,
        teamNumber: data.teamNumber,
        scoutName: data.studentName
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("=== ERROR IN doPost ===");
    Logger.log("Error: " + error.toString());
    Logger.log("Stack: " + (error.stack || "No stack trace"));
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing/verification)
 */
function doGet(e) {
  Logger.log("=== GET REQUEST RECEIVED ===");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "ok",
      message: "FRC 1792 Scouting Webhook (2026 REBUILT) is running",
      timestamp: new Date().toISOString(),
      sheetName: SHEET_NAME,
      sheetExists: sheet ? true : false,
      rowCount: sheet ? sheet.getLastRow() : 0
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Write data to the Google Sheet
 */
function writeToSheet(data) {
  Logger.log("Writing to sheet...");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    Logger.log("Creating sheet...");
    sheet = ss.insertSheet(SHEET_NAME);
    createHeaders(sheet);
  }
  
  // Create headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    Logger.log("Creating headers...");
    createHeaders(sheet);
  }
  
  // Parse timestamp
  const timestamp = data.timestampISO ? new Date(data.timestampISO) : new Date();
  
  // Build row array
  const row = [
    timestamp,                          // Timestamp
    data.studentName || "",             // Scout Name
    data.scoutTeam || "",               // Scout Team
    data.eventCode || "",               // Event Code
    data.matchNumber || 0,              // Match #
    data.teamNumber || 0,               // Team #
    data.alliance || "",                // Alliance
    
    // Auto
    data.autoFuelActive || 0,           // Auto Fuel (Active)
    data.autoTower || "NONE",           // Auto Tower
    data.autoTowerPoints || 0,          // Auto Tower Pts
    
    // Teleop
    data.teleopFuelActive || 0,         // Teleop Fuel (Active)
    data.teleopFuelInactive || 0,       // Teleop Fuel (Inactive)
    data.shuttling || "",               // Shuttling
    
    // Endgame
    data.teleopTower || "NONE",         // Teleop Tower
    data.teleopTowerPoints || 0,        // Teleop Tower Pts
    data.robotStatus || "",             // Robot Status
    data.defenseRating || "",           // Defense Rating
    data.speed || "",                   // Speed
    data.rank || "",                    // Rank
    
    // Calculated
    data.estPoints || 0                 // Est Points
  ];
  
  // Append the row
  sheet.appendRow(row);
  
  Logger.log("✓ Row appended: Match " + data.matchNumber + ", Team " + data.teamNumber);
}

/**
 * Create header row
 */
function createHeaders(sheet) {
  const headers = [
    "Timestamp",
    "Scout Name",
    "Scout Team",
    "Event Code",
    "Match #",
    "Team #",
    "Alliance",
    "Auto Fuel (Active)",
    "Auto Tower",
    "Auto Tower Pts",
    "Teleop Fuel (Active)",
    "Teleop Fuel (Inactive)",
    "Shuttling",
    "Teleop Tower",
    "Teleop Tower Pts",
    "Robot Status",
    "Defense Rating",
    "Speed",
    "Rank (1-3)",
    "Est Points"
  ];
  
  sheet.appendRow(headers);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#ffffff");
  headerRange.setFontColor("#000000");
  headerRange.setHorizontalAlignment("center");
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  Logger.log("✓ Headers created");
}

/**
 * TEST FUNCTION - Run this first to verify setup
 */
function testSetup() {
  Logger.log("=== RUNNING TEST ===");
  
  const testData = {
    timestampISO: new Date().toISOString(),
    studentName: "Test Scout",
    scoutTeam: "1792",
    eventCode: "2026wiapp",
    matchNumber: 999,
    teamNumber: 1792,
    alliance: "Blue",
    autoFuelActive: 5,
    autoTower: "L1",
    autoTowerPoints: 15,
    teleopFuelActive: 12,
    teleopFuelInactive: 3,
    shuttling: "Great",
    teleopTower: "L2",
    teleopTowerPoints: 20,
    robotStatus: "OK",
    defenseRating: "Strong",
    speed: "Fast",
    rank: "1",
    estPoints: 52
  };
  
  try {
    writeToSheet(testData);
    Logger.log("✓✓✓ TEST SUCCESSFUL!");
    Browser.msgBox("Success!", "Check your sheet for test data (Match 999, Team 1792)", Browser.Buttons.OK);
    return "✓ Test successful! Check sheet for Match 999.";
  } catch (error) {
    Logger.log("✗✗✗ TEST FAILED: " + error.toString());
    Browser.msgBox("Test Failed", error.toString(), Browser.Buttons.OK);
    return "✗ Test failed: " + error.toString();
  }
}

/**
 * Initialize sheet
 */
function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    createHeaders(sheet);
    return "✓ Sheet created!";
  } else if (sheet.getLastRow() === 0) {
    createHeaders(sheet);
    return "✓ Headers added!";
  } else {
    return "Sheet already exists with data.";
  }
}

/**
 * Clear all data (keep headers)
 */
function clearData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) return "Sheet not found!";
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
    return "✓ Cleared " + (lastRow - 1) + " rows";
  }
  return "No data to clear";
}
# StudVerse Chat Application - Activity Diagrams

## Overview
This document contains activity diagrams that illustrate the main workflows and system interactions in the StudVerse chat application. These diagrams show the flow of activities from user actions to system responses.

## 1. User Authentication Flow

```mermaid
graph TD
    A[User Opens Application] --> B{User Authenticated?}
    B -->|No| C[Show Login/Register Options]
    B -->|Yes| D[Redirect to Main Interface]
    
    C --> E[User Chooses Action]
    E -->|Login| F[Show Login Form]
    E -->|Register| G[Show Registration Form]
    
    F --> H[User Enters Credentials]
    H --> I[Frontend Validates Input]
    I --> J[Send Login Request to Backend]
    J --> K[Backend Validates Credentials]
    K -->|Invalid| L[Return Error Message]
    K -->|Valid| M[Generate JWT Tokens]
    M --> N[Store Tokens in SessionStorage]
    N --> O[Fetch User Profile]
    O --> P[Check Admin Status]
    P --> Q[Update Auth Context]
    Q --> R[Redirect Based on Role]
    R -->|Admin| S[Show Admin Dashboard]
    R -->|User| T[Show Chat Interface]
    
    G --> U[User Fills Registration Form]
    U --> V[Load College List]
    V --> W[User Selects College]
    W --> X[Frontend Validates Form]
    X --> Y[Send Registration Request]
    Y --> Z[Backend Creates User Account]
    Z --> AA[Create User Profile]
    AA --> BB[Return Success Response]
    BB --> CC[Show Success Message]
    CC --> DD[Redirect to Login]
    
    L --> F
    DD --> F
```

## 2. Real-time Messaging Flow

```mermaid
graph TD
    A[User Opens Chat] --> B[Initialize WebSocket Connection]
    B --> C[Authenticate WebSocket with JWT]
    C -->|Success| D[Join User-Specific Room]
    C -->|Failure| E[Refresh Token and Retry]
    E --> C
    
    D --> F[Load Conversation History]
    F --> G[Display Messages]
    G --> H[User Types Message]
    H --> I[Frontend Validates Message]
    I --> J[Send Message via WebSocket]
    J --> K[Backend Consumer Receives Message]
    K --> L[Validate User Authentication]
    L --> M[Save Message to Database]
    M --> N[Create/Update Conversation]
    N --> O[Broadcast to Recipient Room]
    O --> P[Recipient WebSocket Receives Message]
    P --> Q[Update Recipient UI]
    Q --> R[Show Notification]
    
    J --> S[Update Sender UI]
    S --> T[Show Message Sent Status]
    
    R --> U[Recipient Opens Chat]
    U --> V[Mark Message as Read]
    V --> W[Update Read Status in Database]
    W --> X[Notify Sender of Read Status]
```

## 3. Group Creation and Management Flow

```mermaid
graph TD
    A[User Clicks Create Group] --> B[Show Group Creation Modal]
    B --> C[User Fills Group Details]
    C --> D[User Selects Group Image]
    D --> E[User Searches for Members]
    E --> F[Frontend Validates Form]
    F --> G[Upload Group Image]
    G --> H[Send Group Creation Request]
    H --> I[Backend Validates Request]
    I --> J[Create Group in Database]
    J --> K[Add Creator as Admin]
    K --> L[Add Selected Members]
    L --> M[Save Group Image]
    M --> N[Return Group Data]
    N --> O[Update Frontend UI]
    O --> P[Show Success Message]
    P --> Q[Group Appears in User's Groups]
    
    Q --> R[Send Notifications to Members]
    R --> S[Members Receive Group Invitation]
    S --> T[Members Can Join Group]
    
    T --> U[User Sends Group Message]
    U --> V[Backend Validates Membership]
    V --> W[Save Message to Database]
    W --> X[Broadcast to All Group Members]
    X --> Y[Members Receive Real-time Message]
```

## 4. File Upload and Sharing Flow

```mermaid
graph TD
    A[User Selects File] --> B[Frontend Validates File]
    B -->|Invalid| C[Show Error Message]
    B -->|Valid| D[Show Upload Progress]
    
    D --> E[Create FormData]
    E --> F[Add File to FormData]
    F --> G[Send Upload Request]
    G --> H[Backend Receives File]
    H --> I[Validate File Type and Size]
    I -->|Invalid| J[Return Error Response]
    I -->|Valid| K[Generate Unique Filename]
    K --> L[Save File to Media Directory]
    L --> M[Create File Record in Database]
    M --> N[Return File URL]
    N --> O[Update Frontend with File URL]
    O --> P[File Appears in Chat/Group]
    
    P --> Q[User Sends Message with File]
    Q --> R[Message Sent via WebSocket]
    R --> S[Recipient Receives Message]
    S --> T[Recipient Can Download File]
    
    C --> A
    J --> A
```

## 5. Profile Management Flow

```mermaid
graph TD
    A[User Opens Profile Settings] --> B[Load Current Profile Data]
    B --> C[Display Profile Form]
    C --> D[User Edits Profile Information]
    D --> E[User Uploads New Profile Picture]
    E --> F[Frontend Validates Image]
    F --> G[Show Image Preview]
    G --> H[User Saves Changes]
    H --> I[Send Profile Update Request]
    I --> J[Backend Validates Data]
    J --> K[Update User Profile]
    K --> L[Handle Profile Picture Upload]
    L --> M[Delete Old Profile Picture]
    M --> N[Save New Profile Picture]
    N --> O[Update Database Records]
    O --> P[Return Updated Profile Data]
    P --> Q[Update Auth Context]
    Q --> R[Sync Changes Across Tabs]
    R --> S[Show Success Message]
    S --> T[Profile Updated Successfully]
```

## 6. Admin Panel Workflow

```mermaid
graph TD
    A[Admin Logs In] --> B[Check Admin Permissions]
    B -->|Not Admin| C[Redirect to Regular Interface]
    B -->|Admin| D[Show Admin Dashboard]
    
    D --> E[Admin Selects Section]
    E -->|Users| F[Load User Management]
    E -->|Groups| G[Load Group Management]
    E -->|Forums| H[Load Forum Management]
    E -->|Messages| I[Load Message Monitoring]
    E -->|Colleges| J[Load College Management]
    
    F --> K[Display All Users]
    K --> L[Admin Performs Action]
    L -->|Edit User| M[Show Edit Form]
    L -->|Delete User| N[Confirm Deletion]
    L -->|View User Details| O[Show User Information]
    
    M --> P[Update User Data]
    N --> Q[Delete User from Database]
    O --> R[Display User Statistics]
    
    G --> S[Display All Groups]
    S --> T[Admin Manages Groups]
    T --> U[Edit Group Settings]
    T --> V[Delete Group]
    T --> W[View Group Members]
    
    H --> X[Display All Forums]
    X --> Y[Admin Manages Forums]
    Y --> Z[Edit Forum Settings]
    Y --> AA[Delete Forum]
    Y --> BB[View Forum Channels]
    
    I --> CC[Display Message Statistics]
    CC --> DD[Admin Monitors Messages]
    DD --> EE[View Message Content]
    DD --> FF[Moderate Messages]
    
    J --> GG[Display College List]
    GG --> HH[Admin Manages Colleges]
    HH --> II[Add New College]
    HH --> JJ[Edit College Details]
    HH --> KK[Delete College]
    
    P --> LL[Update Database]
    Q --> MM[Remove User Data]
    U --> NN[Update Group Settings]
    V --> OO[Remove Group Data]
    Z --> PP[Update Forum Settings]
    AA --> QQ[Remove Forum Data]
    II --> RR[Add College to Database]
    JJ --> SS[Update College Information]
    KK --> TT[Remove College from Database]
    
    LL --> UU[Show Success Message]
    MM --> UU
    NN --> UU
    OO --> UU
    PP --> UU
    QQ --> UU
    RR --> UU
    SS --> UU
    TT --> UU
```

## 7. Multi-tab Session Management Flow

```mermaid
graph TD
    A[User Opens New Tab] --> B[Generate Unique Tab ID]
    B --> C[Create Session Key]
    C --> D[Initialize Tab Manager]
    D --> E[Store Tab ID in SessionStorage]
    E --> F[Broadcast Tab Presence]
    F --> G[Check Authentication Status]
    
    G -->|Authenticated| H[Load User Data from Session]
    G -->|Not Authenticated| I[Show Login Interface]
    
    H --> J[Sync with Other Tabs]
    J --> K[Listen for Storage Changes]
    K --> L{Storage Event Detected?}
    L -->|Yes| M[Check Event Type]
    L -->|No| K
    
    M -->|Auth Change| N[Update Authentication State]
    M -->|User Data Change| O[Update User Data]
    M -->|Message Received| P[Update Message List]
    M -->|Profile Update| Q[Update Profile Display]
    
    N --> R[Sync Across All Tabs]
    O --> R
    P --> R
    Q --> R
    
    R --> S[Update UI Components]
    S --> T[Maintain Tab Isolation]
    T --> U[Continue Normal Operation]
    
    I --> V[User Logs In]
    V --> W[Store Auth Data in Session]
    W --> X[Notify Other Tabs]
    X --> Y[Sync Authentication]
    Y --> Z[Redirect to Main Interface]
```

## 8. Forum and Channel Management Flow

```mermaid
graph TD
    A[User Accesses Forums] --> B[Load Available Forums]
    B --> C[Display Forum List]
    C --> D[User Selects Forum]
    D --> E[Load Forum Details]
    E --> F[Show Forum Channels]
    F --> G[User Selects Channel]
    G --> H[Load Channel Messages]
    H --> I[Display Messages]
    
    I --> J[User Actions]
    J -->|Send Message| K[Post Channel Message]
    J -->|Create Channel| L[Show Channel Creation Form]
    J -->|Create Forum| M[Show Forum Creation Form]
    
    K --> N[Validate Message]
    N --> O[Save Message to Database]
    O --> P[Broadcast to Channel Members]
    P --> Q[Update Channel Display]
    
    L --> R[User Fills Channel Details]
    R --> S[Validate Channel Name]
    S --> T[Create Channel in Database]
    T --> U[Add Creator as Admin]
    U --> V[Update Forum Channels List]
    
    M --> W[User Fills Forum Details]
    W --> X[Upload Forum Image]
    X --> Y[Validate Forum Data]
    Y --> Z[Create Forum in Database]
    Z --> AA[Add Creator as Admin]
    AA --> BB[Update Forums List]
    
    Q --> CC[Channel Members Receive Message]
    V --> DD[Channel Appears in Forum]
    BB --> EE[Forum Appears in List]
```

## 9. Location Services Flow

```mermaid
graph TD
    A[User Accesses Nearby Map] --> B[Request Location Permission]
    B -->|Granted| C[Get User's Current Location]
    B -->|Denied| D[Show Location Error]
    
    C --> E[Send Location to Backend]
    E --> F[Update User Location in Database]
    F --> G[Fetch Nearby Users]
    G --> H[Calculate Distances]
    H --> I[Filter by Distance]
    I --> J[Return Nearby Users]
    J --> K[Display Users on Map]
    
    K --> L[User Interactions]
    L -->|Click User| M[Show User Profile]
    L -->|Start Chat| N[Open Chat with User]
    L -->|Update Location| O[Refresh Location Data]
    
    M --> P[Display User Information]
    N --> Q[Initialize Conversation]
    O --> R[Get New Location]
    R --> S[Update Database]
    S --> T[Refresh Nearby Users]
    T --> U[Update Map Display]
    
    D --> V[Show Manual Location Input]
    V --> W[User Enters Location]
    W --> X[Geocode Address]
    X --> Y[Use Geocoded Coordinates]
    Y --> F
```

## 10. Error Handling and Recovery Flow

```mermaid
graph TD
    A[System Operation] --> B{Operation Successful?}
    B -->|Yes| C[Continue Normal Flow]
    B -->|No| D[Identify Error Type]
    
    D -->|Network Error| E[Check Connection]
    D -->|Authentication Error| F[Check Token Validity]
    D -->|Validation Error| G[Show Validation Message]
    D -->|Server Error| H[Show Server Error]
    D -->|File Upload Error| I[Show Upload Error]
    
    E --> J{Connection Available?}
    J -->|Yes| K[Retry Operation]
    J -->|No| L[Show Offline Message]
    
    F --> M{Token Valid?}
    M -->|Yes| N[Retry with Current Token]
    M -->|No| O[Attempt Token Refresh]
    O --> P{Refresh Successful?}
    P -->|Yes| Q[Retry with New Token]
    P -->|No| R[Redirect to Login]
    
    G --> S[Display Field-Specific Errors]
    H --> T[Show Generic Error Message]
    I --> U[Show File-Specific Error]
    
    K --> V{Retry Successful?}
    V -->|Yes| C
    V -->|No| W[Show Retry Failed Message]
    
    L --> X[Enable Offline Mode]
    Q --> Y{Operation Successful?}
    Y -->|Yes| C
    Y -->|No| Z[Show Authentication Error]
    
    R --> AA[Clear Authentication Data]
    AA --> BB[Redirect to Login Page]
    
    W --> CC[Suggest Alternative Action]
    Z --> DD[Show Login Required Message]
    DD --> BB
```

## 11. System Startup and Initialization Flow

```mermaid
graph TD
    A[Application Starts] --> B[Initialize React App]
    B --> C[Load Configuration]
    C --> D[Initialize Tab Manager]
    D --> E[Generate Tab ID]
    E --> F[Create Session Key]
    F --> G[Initialize Auth Context]
    
    G --> H[Check Authentication Status]
    H --> I{User Authenticated?}
    I -->|Yes| J[Load User Profile]
    I -->|No| K[Show Landing Page]
    
    J --> L[Check Admin Status]
    L --> M{User is Admin?}
    M -->|Yes| N[Load Admin Dashboard]
    M -->|No| O[Load Chat Interface]
    
    N --> P[Initialize Admin Components]
    O --> Q[Initialize Chat Components]
    
    Q --> R[Initialize WebSocket Connection]
    R --> S[Load User Conversations]
    S --> T[Load User Groups]
    T --> U[Load User Forums]
    U --> V[Setup Real-time Listeners]
    
    P --> W[Load Admin Data]
    W --> X[Setup Admin Event Handlers]
    
    K --> Y[Show Login/Register Options]
    Y --> Z[Setup Authentication Forms]
    
    V --> AA[Application Ready]
    X --> AA
    Z --> AA
    
    AA --> BB[User Can Interact with System]
```

## 12. Data Synchronization Flow

```mermaid
graph TD
    A[Data Change Occurs] --> B[Identify Change Type]
    B --> C{Change Type}
    
    C -->|Authentication| D[Update Auth State]
    C -->|User Profile| E[Update Profile Data]
    C -->|New Message| F[Add Message to UI]
    C -->|Group Update| G[Update Group Data]
    C -->|Forum Update| H[Update Forum Data]
    
    D --> I[Store in SessionStorage]
    I --> J[Notify Other Tabs]
    J --> K[Update Auth Context]
    
    E --> L[Update User Profile]
    L --> M[Sync Profile Picture]
    M --> N[Update UI Components]
    
    F --> O[Add to Message List]
    O --> P[Update Conversation]
    P --> Q[Show Notification]
    Q --> R[Update Unread Count]
    
    G --> S[Update Group List]
    S --> T[Refresh Group Details]
    T --> U[Update Group Members]
    
    H --> V[Update Forum List]
    V --> W[Refresh Forum Channels]
    W --> X[Update Forum Messages]
    
    K --> Y[Sync Across Tabs]
    N --> Y
    R --> Y
    U --> Y
    X --> Y
    
    Y --> Z[Maintain Data Consistency]
    Z --> AA[Update UI State]
    AA --> BB[User Sees Updated Data]
```

These activity diagrams provide a comprehensive view of how the StudVerse chat application system works, showing the flow of activities from user interactions to system responses. Each diagram focuses on a specific aspect of the system, making it easier to understand the complex interactions between different components.

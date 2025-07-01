
# Arrakis Atlas: Collaborative Dune Mapper

## Overview

Arrakis Atlas is an interactive, grid-based mapping tool designed for guilds and players of the upcoming game *Dune: Awakening*. It allows users to create, share, and collaboratively edit maps of Arrakis, marking points of interest, resources, and strategic locations in real-time.

Built with modern web technologies, this application provides a seamless and responsive experience for planning and exploration.

## Key Features

- **Interactive 9x9 Grid**: A familiar grid system for easy coordinate-based navigation and mapping.
- **Real-time Collaboration**:
    - **Owner/Editor Roles**: Securely manage who can view and edit your maps.
    - **Invite System**: Easily add editors to your maps via a unique invite link.
- **Detailed Cell Editing**:
    - **Custom Markers**: Place a variety of pre-defined icons (Bases, POIs, Resources, etc.) with precise coordinates within any grid cell.
    - **Marker Notes**: Add descriptive notes to any placed marker.
    - **Cell Notes**: Add general notes for an entire grid cell.
    - **Custom Backgrounds**: Upload a custom image to serve as the background for any cell.
- **Map Management**:
    - A centralized dashboard to view and manage all maps you own or have been shared with you.
    - Create, delete, and rename maps.
- **Advanced Sharing**:
    - **Public View-Only Links**: Generate a public, read-only link to share your map with anyone.
    - **Editor Invite Links**: Generate a private link to invite collaborators to edit your map.
- **Authentication**: Secure Google-based authentication for user management.

## Changelog

### July 1, 2024
- **Added:** Cell to cell nav buttons + keyboard shortcuts
- **Improved:** Background uploading and processing

### June 22, 2024
- **Added:** Profile editing (display name)
- **Added:** Last update attribution
- **Improved:** Optimization of background images

### June 20, 2024
- **Added:** Keyboard shortcuts
- **Improved:** Sharing (owner/editor roles, invite URL)
- **Improved:** Grid/cell size

### June 19, 2024
- **Added:** PVE grid borders
- **Added:** Sharing (public view-only URL)
- **Improved:** UI (buttons)

### June 18, 2024
- Launched initial version.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Authentication, Cloud Storage)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Generative AI**: [Google AI & Genkit](https://firebase.google.com/docs/genkit) (for future AI features)

## Future Features / To-Do List
- [ ] Allow users to mark maps as favorites and view them in a dedicated section.
- [ ] Implement a detailed change log for maps with editor attribution.
- [ ] Add new markers for "Control Points".
- [ ] Add new markers for "House Representatives".
- [ ] Allow users to create and share folders for organizing maps.
- [ ] Add a freeform drawing tool for cell canvases.
- [ ] Implement a commenting system for maps or cells.
- [ ] Add map layers to toggle different marker types.
- [ ] Show real-time cursors for other active users on the map.
- [ ] Implement an AI-powered "Strategic Suggestion" tool using Genkit.
- [ ] Add a distance measurement tool.

## Firebase Setup

To run this project locally with your own data, you need to set up a Firebase project.

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Services**:
    - **Authentication**: Enable the **Google** sign-in provider.
    - **Firestore**: Create a new Firestore database in Production mode. You will need to update the Security Rules to allow reads/writes.
    - **Storage**: Enable Cloud Storage.
3.  **Get Firebase Config**: In your Firebase project settings, find your web app's configuration object.
4.  **Create `.env.local` file**:
    - In the root of your project, create a new file named `.env.local`.
    - Copy the contents of `.env.local.example` into your new `.env.local` file.
    - Replace the placeholder values with your actual Firebase project keys.
    - **Important**: You must restart your development server after creating this file.
5.  **Configure Storage CORS**: For the custom background image uploads to work, you must configure Cross-Origin Resource Sharing (CORS) for your Firebase Storage bucket. Follow the instructions in the `CORS_STORAGE_SETUP.md` file in the root of this project.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode.
Open [http://localhost:9002](http://localhost:9002) to view it in the browser.

### `npm run build`

Builds the app for production to the `.next` folder.

### `npm run start`

Starts the production server for the built app.

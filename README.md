# Daypetal — Task Management App

A responsive task manager built with plain HTML, CSS and JavaScript. No framework or build step is required.

## Run it

1. Download and unzip `Daypetal-Task-Manager.zip`.
2. Open the `task-bloom` folder in your code editor.
3. Open `index.html` in a browser (or use the Live Server extension in VS Code).

The app works as a static website. You do not need Node.js, a database, or an account to run it.

## Features

- Create, edit and delete tasks.
- Drag task cards between To do, In progress and Done columns on desktop browsers.
- Change a task's status in the edit form as an alternative to dragging.
- Categories: Personal, Work, Study, Wellness and Other.
- Due dates with today and overdue labels.
- Low, medium and high priority.
- Search, category filters, quick views and sorting.
- Task totals and status counts.
- Automatic saving with `localStorage`, so tasks remain after refreshing or reopening the app in the same browser on the same device.
- Responsive layout for phones, tablets and desktops.

## Saving and privacy

Tasks are stored locally in the browser that you use to open the app. They are not uploaded to a server and will not automatically sync to another device or browser. Clearing that browser's site data can remove the saved tasks. Export, cloud sync and multi-user accounts would require a backend and are not included in this static version.

## Files

- `index.html` — page structure and task form.
- `styles.css` — layout, colours, responsive styling and component states.
- `app.js` — task logic, drag-and-drop, filters and local storage.

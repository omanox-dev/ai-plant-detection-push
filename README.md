# Welcome 

## Project info

## How can I edit this code?

There are several ways of editing your application.


**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Variables & API Configuration

### Hugging Face API Key Setup

The plant chatbot feature uses the Gemini AI API for AI-powered plant advice. To configure this:

1. **Local Development**: Create a `.env` file in your project root and add:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

2. **Backend Configuration**: The API key is loaded from the `.env` file in `server_ai_takeover.py`

3. **Get Your API Key**: 
   - Visit https://makersuite.google.com/app/apikey
   - Create a new API key for Gemini
   - Add it to your `.env` file

**Note**: Never commit API keys to version control. Keep them in `.env` which is gitignored.

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

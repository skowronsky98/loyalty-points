# Project Setup and Usage

## Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (latest LTS version recommended)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [npm](https://www.npmjs.com/)

## Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd <project-directory>
   ```

2. Copy the example environment variables file:
   ```sh
   cp .env.example .env
   ```

3. Install dependencies:
   ```sh
   npm install
   ```

## Database Setup

1. Start the database container using Docker Compose:
   ```sh
   docker compose up 
   ```

2. Run database migrations:
   ```sh
   npm run db -- migration:up
   ```

## Running Tests

To execute integration tests, run:
```sh
npm run test:integration
```

## Development
Start the development server with:
```sh
npm run dev
```

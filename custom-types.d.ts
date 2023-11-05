declare module 'elevenlabs-node' {
    // Define a type for the 'voice' object (assuming 'voice' is an exported object)
    export interface voice {
      // Define properties and methods of the 'voice' object here
      speak: (text: string) => void;
      // ... Add other properties and methods as needed
    }
  
    // Export the 'voice' object as the default export
    const voice: voice;
    export default voice;
  }
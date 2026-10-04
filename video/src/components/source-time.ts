import { createContext, useContext } from 'react';

export const SourceTime = createContext(0);
/** Current source time (seconds) of the enclosing Footage. */
export const useSourceTime = () => useContext(SourceTime);

// Required for React 18+ act() support in Jest
global.IS_REACT_ACT_ENVIRONMENT = true;

// Silence known React Native warnings in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation((msg, ...args) => {
  // Surface real errors, suppress RN internals and act() overlap warnings
  if (typeof msg === 'string' && (
    msg.includes('Warning:') ||
    msg.includes('ReactDOM.render') ||
    msg.includes('act(') ||
    msg.includes('overlapping act')
  )) return;
  console.log(msg, ...args);
});

/** Disabled research scaffold: this script never implemented decryption or verified compute.
 * Use the local simulator for synthetic data. A production adapter requires verified
 * confidential execution and a reviewed key handoff before this path may be enabled.
 */
throw new Error(
  'Remote compute is not implemented. No document or query may be sent to this scaffold.',
);

export const retryQuery = async <T>(
  queryFn: () => Promise<T>, // Function to execute the query
  retries: number, // Number of retries
  delayMs: number // Delay between retries
): Promise<T> => {
  let attempt = 0;

  const retry = async (): Promise<T> => {
    try {
      return await queryFn(); // Try executing the query
    } catch (error) {
      if (attempt < retries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delayMs)); // Wait before retry
        return retry(); // Retry the query
      } else {
        throw error; // Throw error if retries exhausted
      }
    }
  };

  return retry(); // Initial call to retry function
};

export const omitExtraAttributes = <T extends object>(
  obj: Partial<T>,
  schema: T
): T => {
  const validKeys = Object.keys(schema) as Array<keyof T>;
  const filteredObj = {} as T;

  validKeys.forEach((key) => {
    if (key in obj) {
      filteredObj[key] = obj[key] as T[keyof T]; // Ensure proper type assignment
    }
  });

  return filteredObj;
};

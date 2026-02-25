export const getUserRole = () => {
  return localStorage.getItem("user_role");
};

export const isFarmer = () => {
  return getUserRole() === "farmer";
};

export const isConsumer = () => {
  return getUserRole() === "consumer";
};
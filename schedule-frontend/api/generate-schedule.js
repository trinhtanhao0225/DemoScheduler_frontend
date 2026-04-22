import axios from "axios";

const API_URL = "https://demo-scheduler.onrender.com";

export const generateScheduleAPI = async ({
  fakeData,
  schedule,
  constraints
}) => {
  const res = await axios.post(`${API_URL}/generate-schedule`, {
    ...fakeData,
    manual_schedule: schedule || null,
    constraints: constraints || {}
  });

  return res.data;
};
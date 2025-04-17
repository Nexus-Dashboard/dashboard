import axios from "axios";

const ApiBase = axios.create({
  baseURL: "http://localhost:4000",
});

export default ApiBase;
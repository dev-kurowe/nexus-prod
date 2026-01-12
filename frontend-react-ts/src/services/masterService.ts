import api from "./api";

// ============= TYPES =============

export type University = {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  website?: string;
  logo?: string;
  created_at: string;
  updated_at: string;
};

export type Faculty = {
  id: number;
  university_id: number;
  university?: University;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type StudyProgram = {
  id: number;
  faculty_id: number;
  faculty?: Faculty;
  name: string;
  code: string;
  level: string;
  accreditation?: string;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: number;
  nim: string;
  name: string;
  email: string;
  phone: string;
  study_program_id: number;
  study_program?: StudyProgram;
  batch: number;
  status: string;
  address?: string;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: number;
  name: string;
  code: string;
  type: string;
  faculty_id?: number;
  faculty?: Faculty;
  description?: string;
  logo?: string;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: number;
  name: string;
  code: string;
  description?: string;
};

export type MasterUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  password?: string;
  faculty?: string;
  major?: string;
  avatar?: string;
  role_id: number;
  role?: Role;
  created_at: string;
  updated_at: string;
};

// ============= UNIVERSITY SERVICES =============

export const getUniversities = async (isPublic = false) => {
  // Use public endpoint for registration (no auth), master endpoint otherwise
  const endpoint = isPublic ? "/public/universities" : "/master/universities";
  const response = await api.get(endpoint);
  return response.data;
};

export const getUniversityById = async (id: number) => {
  const response = await api.get(`/master/universities/${id}`);
  return response.data;
};

export const createUniversity = async (data: Partial<University>) => {
  const response = await api.post("/master/universities", data);
  return response.data;
};

export const updateUniversity = async (id: number, data: Partial<University>) => {
  const response = await api.put(`/master/universities/${id}`, data);
  return response.data;
};

export const deleteUniversity = async (id: number) => {
  const response = await api.delete(`/master/universities/${id}`);
  return response.data;
};

// ============= FACULTY SERVICES =============

export const getFaculties = async (isPublic = false) => {
  const endpoint = isPublic ? "/public/faculties" : "/master/faculties";
  const response = await api.get(endpoint);
  return response.data;
};

export const getFacultyById = async (id: number) => {
  const response = await api.get(`/master/faculties/${id}`);
  return response.data;
};

export const createFaculty = async (data: Partial<Faculty>) => {
  const response = await api.post("/master/faculties", data);
  return response.data;
};

export const updateFaculty = async (id: number, data: Partial<Faculty>) => {
  const response = await api.put(`/master/faculties/${id}`, data);
  return response.data;
};

export const deleteFaculty = async (id: number) => {
  const response = await api.delete(`/master/faculties/${id}`);
  return response.data;
};

// ============= STUDY PROGRAM SERVICES =============

export const getStudyPrograms = async (isPublic = false) => {
  const endpoint = isPublic ? "/public/study-programs" : "/master/study-programs";
  const response = await api.get(endpoint);
  return response.data;
};

export const getStudyProgramById = async (id: number) => {
  const response = await api.get(`/master/study-programs/${id}`);
  return response.data;
};

export const createStudyProgram = async (data: Partial<StudyProgram>) => {
  const response = await api.post("/master/study-programs", data);
  return response.data;
};

export const updateStudyProgram = async (id: number, data: Partial<StudyProgram>) => {
  const response = await api.put(`/master/study-programs/${id}`, data);
  return response.data;
};

export const deleteStudyProgram = async (id: number) => {
  const response = await api.delete(`/master/study-programs/${id}`);
  return response.data;
};

// ============= STUDENT SERVICES =============

export const getStudents = async () => {
  const response = await api.get("/master/students");
  return response.data;
};

export const getStudentById = async (id: number) => {
  const response = await api.get(`/master/students/${id}`);
  return response.data;
};

export const createStudent = async (data: Partial<Student>) => {
  const response = await api.post("/master/students", data);
  return response.data;
};

export const updateStudent = async (id: number, data: Partial<Student>) => {
  const response = await api.put(`/master/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id: number) => {
  const response = await api.delete(`/master/students/${id}`);
  return response.data;
};

// ============= ORGANIZATION SERVICES =============

export const getOrganizations = async () => {
  const response = await api.get("/master/organizations");
  return response.data;
};

export const getOrganizationById = async (id: number) => {
  const response = await api.get(`/master/organizations/${id}`);
  return response.data;
};

export const createOrganization = async (data: Partial<Organization>) => {
  const response = await api.post("/master/organizations", data);
  return response.data;
};

export const updateOrganization = async (id: number, data: Partial<Organization>) => {
  const response = await api.put(`/master/organizations/${id}`, data);
  return response.data;
};

export const deleteOrganization = async (id: number) => {
  const response = await api.delete(`/master/organizations/${id}`);
  return response.data;
};

// ============= USER SERVICES =============

export const getMasterUsers = async () => {
  const response = await api.get("/master/users");
  return response.data;
};

export const getMasterUserById = async (id: number) => {
  const response = await api.get(`/master/users/${id}`);
  return response.data;
};

export const createMasterUser = async (data: Partial<MasterUser>) => {
  const response = await api.post("/master/users", data);
  return response.data;
};

export const updateMasterUser = async (id: number, data: Partial<MasterUser>) => {
  const response = await api.put(`/master/users/${id}`, data);
  return response.data;
};

export const deleteMasterUser = async (id: number) => {
  const response = await api.delete(`/master/users/${id}`);
  return response.data;
};

// ============= ROLE SERVICES =============

export const getRoles = async () => {
  const response = await api.get("/master/roles");
  return response.data;
};

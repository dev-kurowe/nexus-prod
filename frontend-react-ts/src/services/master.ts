import api from "./api";

// ============= TYPES =============

export interface University {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  website?: string;
  logo?: string;
  created_at: string;
  updated_at: string;
}

export interface Faculty {
  id: number;
  university_id: number;
  university?: University;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface StudyProgram {
  id: number;
  faculty_id: number;
  faculty?: Faculty;
  name: string;
  code: string;
  level: string;
  accreditation?: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
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
}

export interface Organization {
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
}

// ============= UNIVERSITY SERVICES =============

export const getUniversities = async () => {
  const response = await api.get("/master/universities");
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

export const getFaculties = async () => {
  const response = await api.get("/master/faculties");
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

export const getStudyPrograms = async () => {
  const response = await api.get("/master/study-programs");
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

// Default export for better compatibility
export default {
  University,
  Faculty,
  StudyProgram,
  Student,
  Organization,
  getUniversities,
  getUniversityById,
  createUniversity,
  updateUniversity,
  deleteUniversity,
  getFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getStudyPrograms,
  getStudyProgramById,
  createStudyProgram,
  updateStudyProgram,
  deleteStudyProgram,
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};

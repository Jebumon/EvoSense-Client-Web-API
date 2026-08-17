import type { Company } from '@evosensefleet/shared';

export const companies = new Map<string, Company>();

export const getCompanyById = (id: string) => companies.get(id);
export const getAllCompanies = () => Array.from(companies.values());
export const saveCompany = (company: Company) => companies.set(company.id, company);
export const deleteCompany = (companyId: string) => companies.delete(companyId);

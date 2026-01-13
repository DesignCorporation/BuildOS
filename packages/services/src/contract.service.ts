// BuildOS - Contract Service
// Business logic for project contracts

import {
  prisma,
  ContractRepository,
  CreateContractInput,
  CreateMilestoneInput,
} from "@buildos/database";
import { RepositoryContext } from "@buildos/database";

export class ContractService {
  private contractRepo: ContractRepository;

  constructor(context: RepositoryContext) {
    this.contractRepo = new ContractRepository(prisma, context);
  }

  async getContractsByProjectId(projectId: string) {
    return this.contractRepo.findByProjectId(projectId, { limit: 50 });
  }

  async createContract(
    contract: CreateContractInput,
    milestones: CreateMilestoneInput[]
  ) {
    return this.contractRepo.create(contract, milestones);
  }

  async addMilestones(contractId: string, milestones: CreateMilestoneInput[]) {
    return this.contractRepo.addMilestones(contractId, milestones);
  }

  async deleteMilestone(id: string) {
    return this.contractRepo.deleteMilestone(id);
  }
}

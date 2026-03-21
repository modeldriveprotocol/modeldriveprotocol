import type {
  CapabilityKind,
  ClientConnectionDescriptor,
  ClientDescriptor,
  IndexedPromptDescriptor,
  IndexedResourceDescriptor,
  SkillDescriptor,
  IndexedSkillDescriptor,
  IndexedToolDescriptor,
  ListedClient
} from "@modeldriveprotocol/protocol";

export interface RegisteredClientSnapshot {
  descriptor: ClientDescriptor;
  connectedAt: Date;
  lastSeenAt: Date;
  connection: ClientConnectionDescriptor;
}

export interface CapabilityTarget {
  clientId: string;
  kind: CapabilityKind;
  name?: string;
  uri?: string;
}

export class CapabilityIndex {
  constructor(
    private readonly listRegisteredClients: () => RegisteredClientSnapshot[]
  ) {}

  listClients(): ListedClient[] {
    return this.listRegisteredClients().map(
      ({ descriptor, connectedAt, lastSeenAt, connection }) => ({
        ...descriptor,
        status: "online",
        connectedAt: connectedAt.toISOString(),
        lastSeenAt: lastSeenAt.toISOString(),
        connection
      })
    );
  }

  listTools(clientId?: string): IndexedToolDescriptor[] {
    return this.filterClients(clientId).flatMap(({ descriptor }) =>
      descriptor.tools.map((tool) => ({
        clientId: descriptor.id,
        clientName: descriptor.name,
        ...tool
      }))
    );
  }

  listPrompts(clientId?: string): IndexedPromptDescriptor[] {
    return this.filterClients(clientId).flatMap(({ descriptor }) =>
      descriptor.prompts.map((prompt) => ({
        clientId: descriptor.id,
        clientName: descriptor.name,
        ...prompt
      }))
    );
  }

  listSkills(clientId?: string): IndexedSkillDescriptor[] {
    return this.filterClients(clientId).flatMap(({ descriptor }) =>
      descriptor.skills.map((skill) => ({
        clientId: descriptor.id,
        clientName: descriptor.name,
        ...skill
      }))
    );
  }

  listResources(clientId?: string): IndexedResourceDescriptor[] {
    return this.filterClients(clientId).flatMap(({ descriptor }) =>
      descriptor.resources.map((resource) => ({
        clientId: descriptor.id,
        clientName: descriptor.name,
        ...resource
      }))
    );
  }

  getSkill(clientId: string, skillName: string): SkillDescriptor | undefined {
    return this.findClient(clientId)?.skills.find((skill) => skill.name === skillName);
  }

  hasTarget(target: CapabilityTarget): boolean {
    const client = this.findClient(target.clientId);

    if (!client) {
      return false;
    }

    switch (target.kind) {
      case "tool":
        return client.tools.some((item) => item.name === target.name);
      case "prompt":
        return client.prompts.some((item) => item.name === target.name);
      case "skill":
        return client.skills.some((item) => item.name === target.name);
      case "resource":
        return client.resources.some((item) => item.uri === target.uri);
    }
  }

  findMatchingClientIds(target: Omit<CapabilityTarget, "clientId">): string[] {
    return this.listRegisteredClients()
      .map((snapshot) => snapshot.descriptor)
      .filter((descriptor) => {
        switch (target.kind) {
          case "tool":
            return descriptor.tools.some((item) => item.name === target.name);
          case "prompt":
            return descriptor.prompts.some((item) => item.name === target.name);
          case "skill":
            return descriptor.skills.some((item) => item.name === target.name);
          case "resource":
            return descriptor.resources.some((item) => item.uri === target.uri);
        }
      })
      .map((descriptor) => descriptor.id);
  }

  private filterClients(clientId?: string): RegisteredClientSnapshot[] {
    const snapshots = this.listRegisteredClients();

    return clientId === undefined
      ? snapshots
      : snapshots.filter(({ descriptor }) => descriptor.id === clientId);
  }

  private findClient(clientId: string): ClientDescriptor | undefined {
    return this.listRegisteredClients().find(
      ({ descriptor }) => descriptor.id === clientId
    )?.descriptor;
  }
}

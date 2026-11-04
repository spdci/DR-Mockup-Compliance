import { defineParameterType } from '@cucumber/cucumber';

// DR record types: PWDPerson (DO.DR.01 person with disability), DRPerson (person), Member, Group,
// and SupportRecord (the disability support of one person, returned by get-disability-support).
defineParameterType({
  name: 'recordType',
  regexp: /PWDPerson|DRPerson|Member|Group|SupportRecord/,
  transformer: (s) => s,
});

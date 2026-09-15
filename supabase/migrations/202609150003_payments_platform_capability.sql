-- OmniPay is shared platform infrastructure, not a purchasable module entitlement.
delete from public.team_member_module_permissions where module_key='omnipay';
delete from public.team_module_entitlements where module_key='omnipay';

alter table public.team_member_module_permissions
  drop constraint if exists team_member_module_permissions_module_key_check;
alter table public.team_member_module_permissions
  add constraint team_member_module_permissions_module_key_check check (module_key in (
    'omniathlete','omnischedule','omnimeet','omnivolunteer','omniconnect','omnisite','omniinsights'
  ));
alter table public.team_module_entitlements
  drop constraint if exists team_module_entitlements_module_key_check;
alter table public.team_module_entitlements
  add constraint team_module_entitlements_module_key_check check (module_key in (
    'omniathlete','omnischedule','omnimeet','omnivolunteer','omniconnect','omnisite','omniinsights'
  ));
alter table public.subscription_plans
  drop constraint if exists subscription_plans_module_keys_check;
alter table public.subscription_plans
  add constraint subscription_plans_module_keys_check check (module_keys <@ array[
    'omniathlete','omnischedule','omnimeet','omnivolunteer','omniconnect','omnisite','omniinsights'
  ]::text[]);

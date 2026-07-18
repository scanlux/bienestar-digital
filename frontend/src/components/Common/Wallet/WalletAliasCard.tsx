import React from 'react';
import styled from 'styled-components';
import { Spinner } from '../UIElements';
import {
  BalanceCard,
  CardHeader,
  CardTitle,
  BalanceContainer,
  MainBalanceRow,
  BalanceEquivalent,
  EyeButton
} from './BaseWalletLayout';

const AliasCard = styled(BalanceCard)``;

const AliasMain = styled.h2<{ $inactive?: boolean }>`
  font-size: 2.25rem;
  font-weight: 800;
  color: ${p => p.$inactive ? 'rgba(255, 255, 255, 0.25)' : 'var(--emerald, #10b981)'};
  margin: 0;
  font-family: monospace;
  letter-spacing: 0.05em;
  text-shadow: ${p => p.$inactive ? 'none' : '0 0 15px rgba(16, 185, 129, 0.3)'};
  display: flex;
  align-items: center;
  gap: 0.35rem;

  &::before {
    content: '@';
    color: ${p => p.$inactive ? 'rgba(255, 255, 255, 0.25)' : '#fff'};
    font-weight: 400;
  }
`;

const OtherAliasesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  align-items: center;
`;

const AliasLabelSmall = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 600;
`;

const AliasBadge = styled.span`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-family: monospace;
  font-weight: 500;
  letter-spacing: 0.02em;

  &::before {
    content: '@';
    color: rgba(255, 255, 255, 0.35);
  }
`;

const ManageAliasLinkButton = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.95rem;
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  padding: 0;
  align-self: flex-start;
  transition: color 0.2s;
  margin: 0;
  line-height: 1.4;

  &:hover {
    color: #60a5fa;
  }
`;

interface Alias {
  id: number;
  alias: string;
  is_main: number;
}

interface WalletAliasCardProps {
  loadingAliases: boolean;
  aliases: Alias[];
  readOnly: boolean;
  openAliasModal: () => void;
}

export function WalletAliasCard({
  loadingAliases,
  aliases,
  readOnly,
  openAliasModal
}: WalletAliasCardProps) {
  return (
    <AliasCard>
      <CardHeader>
        <CardTitle>Alias Bre-b Asociados</CardTitle>
        {!readOnly && (
          <EyeButton onClick={openAliasModal} title="Gestionar Alias Bre-b" type="button">
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </EyeButton>
        )}
      </CardHeader>
      <BalanceContainer>
        {loadingAliases ? (
          <MainBalanceRow>
            <Spinner
              style={{ width: '30px', height: '30px', borderTopColor: 'var(--emerald, #10b981)' }}
            />
          </MainBalanceRow>
        ) : aliases.length > 0 ? (
          <>
            <MainBalanceRow>
              <AliasMain>{aliases[0].alias}</AliasMain>
            </MainBalanceRow>
            {aliases.length > 1 ? (
              <OtherAliasesContainer>
                <AliasLabelSmall>Otros alias:</AliasLabelSmall>
                {aliases.slice(1).map(al => (
                  <AliasBadge key={al.id}>{al.alias}</AliasBadge>
                ))}
              </OtherAliasesContainer>
            ) : (
              <BalanceEquivalent>
                Llave alias Bre-b principal configurada.
              </BalanceEquivalent>
            )}
          </>
        ) : (
          <>
            <MainBalanceRow>
              <AliasMain $inactive={true}>sin-alias</AliasMain>
            </MainBalanceRow>
            {!readOnly ? (
              <ManageAliasLinkButton onClick={openAliasModal} type="button">
                Configurar llave Bre-b
              </ManageAliasLinkButton>
            ) : (
              <BalanceEquivalent>
                Sin llaves configuradas.
              </BalanceEquivalent>
            )}
          </>
        )}
      </BalanceContainer>
    </AliasCard>
  );
}

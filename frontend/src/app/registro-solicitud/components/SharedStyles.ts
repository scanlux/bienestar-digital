import styled from 'styled-components';

export const SharedStyles = {
  InputWrapper: styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `,
  Label: styled.label`
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: -0.01em;
  `,
  Input: styled.input`
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.95rem 1.15rem;
    border-radius: 1rem;
    color: #fff;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--emerald);
      background: rgba(72, 214, 76, 0.02);
      box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.05);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  Select: styled.select`
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.95rem 1.15rem;
    border-radius: 1rem;
    color: #fff;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    appearance: none;
    cursor: pointer;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--emerald);
      background: rgba(72, 214, 76, 0.02);
      box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.05);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    option {
      background: #121212;
      color: #fff;
    }
  `,
  UploadSectionTitle: styled.h3`
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    margin-top: 1rem;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 0.5rem;
  `,
  DocumentTable: styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.02);
    overflow: hidden;
  `,
  DocumentRow: styled.div<{ $isEditable?: boolean }>`
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    align-items: center;
    padding: 1.25rem 1.75rem;
    border-bottom: ${props => props.$isEditable ? '1px dashed #ef4444 !important' : '1px solid rgba(255, 255, 255, 0.08)'};
    border: ${props => props.$isEditable ? '1px dashed #ef4444' : 'none'};
    border-radius: ${props => props.$isEditable ? '0.75rem' : '0'};
    background: ${props => props.$isEditable ? 'rgba(239, 68, 68, 0.02)' : 'transparent'};
    gap: 1.5rem;

    &:last-child {
      border-bottom: ${props => props.$isEditable ? '1px dashed #ef4444' : 'none'};
    }

    @media (max-width: 580px) {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      padding: 1.25rem 1rem;
    }
  `,
  DocLabelWrapper: styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  `,
  DocLabel: styled.span`
    font-size: 0.95rem;
    font-weight: 600;
    color: #fff;
    letter-spacing: -0.01em;
  `,
  DocDesc: styled.span`
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.3;
  `,
  FileLabel: styled.label<{ $hasFile: boolean; $uploading: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed ${props => props.$hasFile ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.15)'};
    padding: 0.95rem;
    border-radius: 1rem;
    color: ${props => props.$hasFile ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.6)'};
    font-size: 0.85rem;
    cursor: ${props => props.$uploading ? 'not-allowed' : 'pointer'};
    transition: all 0.3s ease;
    text-align: center;
    width: 100%;
    box-sizing: border-box;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--emerald);
    }
  `,
  HiddenInput: styled.input`
    display: none;
  `
};

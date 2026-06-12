import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const TitleGroup = styled.div``;

export const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
`;

export const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.95rem;
`;

export const Content = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 2rem;
`;

export const AddSection = styled.form`
  display: flex;
  gap: 1rem;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

export const Input = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.8rem 1.2rem;
  color: #fff;
  font-size: 1rem;
  &:focus { outline: 1px solid var(--emerald); }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
`;

export const WordCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }
`;

export const WordText = styled.span`
  color: #fff;
  font-weight: 500;
  font-size: 0.9rem;
`;

export const DeleteBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.1rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.4rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 77, 77, 0.2);
    color: #ff4d4d;
    transform: scale(1.1);
  }
`;

export const EmptyMsg = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.2);
`;

import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

export const StatusMsg = styled.span`
  color: var(--emerald);
  font-size: 0.9rem;
  font-weight: 500;
`;

export const ActionButton = styled.button`
  background: var(--emerald);
  color: #000;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(72, 214, 76, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
`;

export const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 1.5rem;
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

export const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
`;

export const Badge = styled.span`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    text-align: left;
    padding: 1rem;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  td {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    color: #fff;
    font-size: 0.9rem;
  }
`;

export const ProductCell = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const ProductImg = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
`;

export const ProductName = styled.span`
  font-weight: 500;
`;

export const StoreTag = styled.span`
  background: rgba(72, 214, 76, 0.1);
  color: var(--emerald);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
`;

export const Count = styled.span`
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
`;

export const DateText = styled.span`
  color: rgba(255, 255, 255, 0.4);
`;

export const LoadingText = styled.div`
  padding: 4rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.2);
`;

export const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 1.2rem;
  padding: 1.5rem;
  border-left: 4px solid var(--emerald);
`;

export const StatTitle = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.5rem;
`;

export const StatValue = styled.div<{ color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.color || '#fff'};
  margin-bottom: 0.25rem;
`;

export const StatDesc = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.2);
`;

export const ProgressWrapper = styled.div`
  margin-bottom: 1rem;
`;

export const ProgressBar = styled.div<{ width: number }>`
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
  margin-bottom: 0.5rem;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.width}%;
    background: var(--emerald);
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(72, 214, 76, 0.5);
  }
`;

export const ProgressText = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
`;
